import { protectedProcedure, router } from '@/server/trpc';
import { prisma } from '../db';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { PlayerPerm } from '@/lib/online/types';
import { triggerLobbyRefetch } from '../pusher';
import { zFightOptions, zFightSide } from '@/lib/online/z';
import { randomUUID } from 'crypto';
import { kv } from '../kv';
import { entries } from '@/lib/utils';
import { logger } from '../logger';

export const lobbiesRouter = router({
    getOwnPlayerships: protectedProcedure
        .query(async ({ ctx }) => {
            const playerships = await prisma.playership.findMany({
                where: { userId: ctx.session.user.id },
                include: { lobby: {
                    include: {
                        owner: {
                            select: {
                                name: true,
                            },
                        },
                        playerships: {
                            include: {
                                user: {
                                    select: {
                                        name: true,
                                        image: true,
                                    },
                                },
                            },
                        },
                    },
                } },
            });
            return playerships;
        }),
    get: protectedProcedure
        .input(z.object({
            id: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const lobby = await prisma.lobby.findFirst({
                where: { id: input.id },
                include: { playerships: {
                    include: { user: true },
                    orderBy: { joinedAt: 'asc' },
                } },
            });
            if (!lobby) return null;
            if (!lobby.playerships.some(player => player.userId))
                throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not a player in this lobby' });

            const sides = await kv.getLobbySides(lobby.id);
            const decks = await kv.getLobbyDecks(lobby.id);
            const gameId = await kv.getLobbyGame(lobby.id);

            return { ...lobby, sides, decks, gameId };
        }),
    create: protectedProcedure
        .mutation(async ({ ctx }) => {
            const lobbyCount = await prisma.lobby.count({ where: { ownerId: ctx.session.user.id } });
            if (lobbyCount >= 3) throw new TRPCError({ code: 'FORBIDDEN', message: 'You cannot own more than 3 lobbies' });

            const lobbyId = randomUUID();
            try {
                return await prisma.lobby.create({
                    data: {
                        id: lobbyId,
                        ownerId: ctx.session.user.id,
                        options: {},
                        version: 0,
                        playerships: {
                            create: [{
                                userId: ctx.session.user.id,
                                permissions: PlayerPerm.Admin,
                            }],
                        },
                    },
                });
            } finally {
                logger.debug('[Lobby] Created lobby', { userId: ctx.session.user.id, lobbyId });
            }
        }),
    delete: protectedProcedure
        .input(z.object({
            id: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            await prisma.lobby.delete({
                where: { id: input.id },
            }).catch(err => {
                if (err instanceof Prisma.PrismaClientKnownRequestError) {
                    if (err.code === 'P2025') throw new TRPCError({ code: 'NOT_FOUND', message: 'Lobby not found' });
                }
                throw err;
            });
            await kv.flushLobby(input.id);
            triggerLobbyRefetch(input.id, ctx.session.user.id);
        }),
    join: protectedProcedure
        .input(z.object({
            id: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            await prisma.playership.create({
                data: {
                    lobbyId: input.id,
                    userId: ctx.session.user.id,
                    permissions: 0,
                },
            });
            triggerLobbyRefetch(input.id, ctx.session.user.id);
        }),
    leave: protectedProcedure
        .input(z.object({
            id: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            await prisma.playership.delete({
                where: {
                    lobbyId_userId: {
                        lobbyId: input.id,
                        userId: ctx.session.user.id,
                    },
                },
            });
            await kv.flushLobbyPlayer(input.id, `${ctx.session.user.id}`);
            triggerLobbyRefetch(input.id, ctx.session.user.id);
        }),

    // Options
    setPlayerSide: protectedProcedure
        .input(z.object({
            id: z.string(),
            userId: z.string(),
            side: zFightSide,
        }))
        .mutation(async ({ ctx, input }) => {
            const lobby = await prisma.lobby.findFirst({ where: { id: input.id } });
            if (!lobby) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lobby not found' });
            if (lobby.ownerId !== ctx.session.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not the owner of this lobby' });

            const sides = await kv.getLobbySides(lobby.id);
            for (const [side, user] of entries(sides)) {
                if (user === input.userId) await kv.setLobbySide(lobby.id, side, null);
            }
            await kv.setLobbySide(lobby.id, input.side, input.userId);

            triggerLobbyRefetch(input.id, ctx.session.user.id);
        }),
    selectOwnDeck: protectedProcedure
        .input(z.object({
            id: z.string(),
            deck: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const lobby = await prisma.lobby.findFirst({ where: { id: input.id }, include: { playerships: true } });
            if (!lobby) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lobby not found' });
            if (!lobby.playerships.some(player => player.userId === ctx.session.user.id))
                throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not a player in this lobby' });

            await kv.setLobbyDeck(lobby.id, `${ctx.session.user.id}`, input.deck);

            triggerLobbyRefetch(input.id, ctx.session.user.id);
        }),
    changeOptions: protectedProcedure
        .input(z.object({
            id: z.string(),
            options: zFightOptions.partial(),
        }))
        .mutation(async ({ ctx, input }) => {
            const lobby = await prisma.lobby.findFirst({ where: { id: input.id } });
            if (!lobby) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lobby not found' });
            if (lobby.ownerId !== ctx.session.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not the owner of this lobby' });

            await prisma.lobby.update({
                where: { id: input.id },
                data: {
                    options: input.options,
                },
            });
            triggerLobbyRefetch(input.id, ctx.session.user.id);
        }),
});
