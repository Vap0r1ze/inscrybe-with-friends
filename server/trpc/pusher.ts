import { protectedProcedure, router } from '@/server/trpc';
import { z } from 'zod';
import { pusherServer } from '../pusher';
import { entries } from '@/lib/utils';
import { TRPCError } from '@trpc/server';
import { prisma } from '../db';

const privateChannels = entries({
    lobby: 'lobby@{id}',
}).map(([name, pattern]) => ({
    name,
    pattern: new RegExp(`^private-${pattern
        .replace('{id}', '([a-z0-9-]+)')}$`),
}));

export const pusherRouter = router({
    // Provide access to private channels
    authorize: protectedProcedure
        .input(z.object({
            socketId: z.string(),
            channelName: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const channel = privateChannels.find(c => input.channelName.match(c.pattern));
            if (!channel) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unkown private channel' });
            const match = input.channelName.match(channel.pattern)!;

            // Auth checks
            switch (channel.name) {
                case 'lobby': {
                    const [, lobbyId] = match;
                    const lobby = await prisma.lobby.findFirst({ where: {
                        id: lobbyId,
                        // TODO: !invite_only || playership.some
                        // playerships: { some: { userId: ctx.session.user.id } },
                    } });
                    if (!lobby) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Lobby not found' });
                }
            }

            return pusherServer.authorizeChannel(input.socketId, input.channelName);
        }),

    // Get user data
    authenticate: protectedProcedure
        .input(z.object({
            socketId: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const authUser = pusherServer.authenticateUser(input.socketId, {
                id: ctx.session.user.id,
                name: ctx.session.user.name,
                image: ctx.session.user.image,
            });
            return authUser;
        }),
});
