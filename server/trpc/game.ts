import { z } from 'zod';
import { downConcurrency, protectedProcedure, router, upConcurrency } from '.';
import { TRPCError } from '@trpc/server';
import { prisma } from '../db';
import { defaultFightOptions, zDeckCards, zFightOptions, zFightSide, zFightSides, zPlayerMessage } from '@/lib/online/z';
import { kv } from '../kv';
import { FightHost, createFightHost, createTick } from '@/lib/engine/Host';
import { FIGHT_SIDES, FightSide, createFight, translateFight } from '@/lib/engine/Fight';
import { FightPacket, handleAction, handleResponse, startGame, translatePacket } from '@/lib/engine/Tick';
import { Event, translateEvent } from '@/lib/engine/Events';
import { clone, entries, fromEntries, shuffle } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import { triggerFightPacket, triggerGameEnd, triggerLobbyGameStart, triggerLobbyRefetch } from '../pusher';
import { LogContext, logger } from '../logger';
import { randomUUID } from 'crypto';

const newTick = (host: FightHost, ctx?: LogContext) => {
    const tick = createTick(host, {
        adapter: {
            async initDeck(side, deckType) {
                const idxs = this.fight.decks[side][deckType].map((card, i) => i);
                return shuffle(idxs);
            },
        },
        logger: {
            warn: (msg) => logger.warn(msg, ctx),
            error: (msg) => logger.error(msg, ctx),
            debug: (msg) => logger.debug(msg, ctx),
            info: (msg) => logger.info(msg, ctx),
        },
    });
    return tick;
};

const handlePacket = async (gameId: string, packet: FightPacket, opts: {
    sideUsers?: Record<FightSide, string>,
} = {}) => {
    let sideUsers = opts.sideUsers ?? await (async () => {
        const players = await prisma.gamePlayer.findMany({
            where: { gameId },
        });
        const playerId = players.find(p => p.side === 'player')?.userId;
        const opposingId = players.find(p => p.side === 'opposing')?.userId;
        if (!playerId || !opposingId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Game is missing players' });
        return { player: playerId, opposing: opposingId };
    })();

    // TODO: prevent by chunking packets
    if (JSON.stringify(packet).length > 10_000)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Packet is too large' });

    await prisma.gamePacket.create({
        data: {
            gameId,
            packet: packet as Prisma.JsonObject,
        },
    });

    const outboundPackets = fromEntries(entries(sideUsers).map(([side, userId]): [FightSide, FightPacket] => {
        const events = clone(packet.settled).map(e => translateEvent(e, side)).filter(e => e) as Event[];
        return [side, { settled: events }];
    }));

    return outboundPackets;
};

export const gameRouter = router({
    get: protectedProcedure
        .input(z.object({
            gameId: z.string(),
            includeInitPacket: z.boolean().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const game = await prisma.game.findFirst({ where: { id: input.gameId } });
            if (!game) throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });

            // TODO: account for spectators

            const player = await prisma.gamePlayer.findFirst({
                where: { gameId: input.gameId, userId: ctx.session.user.id },
            });
            if (!player) throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not a player in this game' });

            const side = zFightSide.parse(player.side);

            const host = await kv.getHost(input.gameId);
            if (!host) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Game host not found' });

            const outboundFight = translateFight(host.fight, side);

            let initPacket: FightPacket | null = null;
            if (input.includeInitPacket) {
                const [firstPacket, secondPacket] = await prisma.gamePacket.findMany({
                    where: { gameId: input.gameId },
                    orderBy: { createdAt: 'asc' },
                    take: 2,
                });
                if (firstPacket && !secondPacket) initPacket = firstPacket.packet as FightPacket;
                else if (!firstPacket) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Game has not started' });
            }

            const outboundInitPacket: FightPacket | null = initPacket && translatePacket(initPacket, side);

            return {
                id: input.gameId,
                fight: outboundFight,
                initPacket: outboundInitPacket,
            };
        }),
    start: protectedProcedure
        .input(z.object({
            lobbyId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const lobby = await prisma.lobby.findFirst({ where: { id: input.lobbyId } });
            if (!lobby) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lobby not found' });
            if (lobby.ownerId !== ctx.session.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not the owner of this lobby' });

            const preexistingGameId = await kv.getLobbyGame(input.lobbyId);
            if (preexistingGameId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Game already started' });

            const sides = zFightSides.nullable().catch(null).parse(await kv.getLobbySides(input.lobbyId));
            if (!sides || sides.opposing === sides.player)
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'You must have two different players' });

            const decks = await kv.getLobbyDecks(input.lobbyId);
            const playerDeckName = decks[sides.player];
            const opposingDeckName = decks[sides.opposing];
            if (!playerDeckName || !opposingDeckName)
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Both players must have a deck selected' });

            const [playerDeck, opposingDeck] = await prisma.$transaction([
                prisma.deck.findFirst({ where: { name: playerDeckName } }),
                prisma.deck.findFirst({ where: { name: opposingDeckName } }),
            ]);

            if (!playerDeck || !opposingDeck)
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Both players must have a cloud-saved deck selected' });

            // TODO: verify that the decks are valid

            const concurrencyKey = `game-start:${input.lobbyId}`;
            await upConcurrency(concurrencyKey, 1, () => { throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Game is already starting',
            }); });

            try {
                const changedFightOptions = zFightOptions.partial().parse(lobby.options);
                const fightOptions = { ...defaultFightOptions(changedFightOptions.ruleset), ...changedFightOptions };
                const fight = createFight(fightOptions, ['player', 'opposing'], {
                    player: zDeckCards.parse(playerDeck.cards),
                    opposing: zDeckCards.parse(opposingDeck.cards),
                });
                const host = createFightHost(fight);

                const gameId = randomUUID();

                logger.debug('Starting lobby game', { lobbyId: input.lobbyId, gameId });

                const tick = newTick(host, { lobbyId: lobby.id, gameId });
                const initPacket = await startGame(tick);

                // TODO: handle errors past this point by rolling back changes

                await prisma.game.create({
                    data: {
                        id: gameId,
                        lobbyId: lobby.id,
                        players: { createMany: { data: [
                            { userId: sides.player, side: 'player' },
                            { userId: sides.opposing, side: 'opposing' },
                        ] } },
                    },
                });

                await kv.setLobbyGame(lobby.id, gameId);
                await kv.setHost(gameId, host);

                logger.debug('Lobby game started', { lobbyId: input.lobbyId, gameId });

                await kv.setGameSides(gameId, sides);

                await handlePacket(gameId, initPacket, {
                    sideUsers: { player: sides.player, opposing: sides.opposing },
                });

                triggerLobbyGameStart(lobby.id);

                await kv.setHost(gameId, host);
            } finally {
                await downConcurrency(concurrencyKey);
                await logger.flush();
            }
        }),
    actionMessage: protectedProcedure
        .input(z.object({
            gameId: z.string(),
            data: zPlayerMessage,
        }))
        .mutation(async ({ ctx, input }) => {
            const host = await kv.getHost(input.gameId);
            if (!host) throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });

            await upConcurrency(`game-action:${input.gameId}`, 1, () => { throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Game is already processing an action',
            }); });

            // TODO: replace try / finally with 'using' statements
            try {
                const sides = await kv.getGameSides(input.gameId);
                if (!sides) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Game is missing players' });
                const userSide = entries(sides).find(([, userId]) => userId === ctx.session.user.id)?.[0];
                if (!userSide) throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not a player in this game' });

                logger.debug(`Handling game message: ${JSON.stringify(input.data)}`, { gameId: input.gameId });

                const tick = newTick(host, { gameId: input.gameId });
                const serverPacket = input.data.type === 'action'
                    ? await handleAction(tick, userSide, input.data.action) : input.data.type === 'response'
                        ? await handleResponse(tick, userSide, input.data.res) : null;

                if (!serverPacket) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Invalid message' });

                const outboundPackets = await handlePacket(input.gameId, serverPacket);

                await kv.setHost(input.gameId, host);

                for (const [side, packet] of entries(outboundPackets)) {
                    triggerFightPacket(sides[side], input.gameId, packet);
                }

                const aliveSides = FIGHT_SIDES.filter(side => (
                    host.fight.players[side].deaths < host.fight.opts.lives
                ));
                const winningSide = aliveSides.length === 1 ? aliveSides[0] : null;

                if (winningSide) {
                    await kv.flushGame(input.gameId);
                    const game = await prisma.game.update({ where: { id: input.gameId }, data: { endedAt: new Date() } });

                    if (game.lobbyId) await kv.setLobbyGame(game.lobbyId, null);

                    const winningPlayer = await prisma.gamePlayer.findFirst({
                        where: { gameId: input.gameId, userId: sides[winningSide] },
                        include: { user: true },
                    });

                    if (winningPlayer)
                        logger.debug(`User '${winningPlayer.user.name}' won game`, { gameId: input.gameId, userId: winningPlayer.userId });
                    else
                        logger.error(`Game ended without a winner: ${JSON.stringify({
                            fightPlayers: host.fight.players,
                            fightOpts: host.fight.opts,
                            aliveSides,
                        })}`, { gameId: input.gameId });

                    const endMessage = winningPlayer ? `${winningPlayer.user.name} won!` : 'The game ended in a draw due to an internal error!';
                    for (const side of FIGHT_SIDES)
                        triggerGameEnd(sides[side], input.gameId, endMessage);
                }
            } finally {
                await downConcurrency(`game-action:${input.gameId}`);
                await logger.flush();
            }
        }),
    forfeit: protectedProcedure
        .input(z.object({
            lobbyId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const gameId = await kv.getLobbyGame(input.lobbyId);
            const [lobby, game] = gameId ? await prisma.$transaction([
                prisma.lobby.findFirst({ where: { id: input.lobbyId } }),
                prisma.game.findFirst({ where: { id: gameId }, include: { players: true } }),
            ]) : [null, null];
            if (!lobby) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lobby not found' });
            if (!game || !gameId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'There is no game' });

            if (!game.players.some(player => player.userId === ctx.session.user.id))
                throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not a player in this game' });

            logger.debug(`Player '${ctx.session.user.name}' is forfeiting lobby game`, { lobbyId: input.lobbyId, userId: ctx.session.user.id, gameId });

            try {
                await kv.setLobbyGame(input.lobbyId, null);
                await kv.flushGame(gameId);
                await prisma.game.update({ where: { id: gameId }, data: { endedAt: new Date() } });

                for (const player of game.players)
                    triggerGameEnd(player.userId, gameId, `${ctx.session.user.name} has forfeited the game`);
                triggerLobbyRefetch(input.lobbyId, ctx.session.user.id);
            } finally {
                await logger.flush();
            }
        }),
});
