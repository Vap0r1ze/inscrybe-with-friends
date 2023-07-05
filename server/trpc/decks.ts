import { protectedProcedure, router } from '@/server/trpc';
import { prisma } from '../db';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { zDeckCards } from '@/lib/online/z';

export const deckRouter = router({
    getOwn: protectedProcedure
        .query(async ({ ctx }) => {
            return await prisma.deck.findMany({
                where: { ownerId: ctx.session.user.id },
                orderBy: { name: 'asc' },
            });
        }),
    save: protectedProcedure
        .input(z.object({
            name: z.string(),
            rename: z.string().optional(),
            ruleset: z.string(),
            cards: zDeckCards,
        }))
        .mutation(async ({ ctx, input }) => {
            const exists = !!await prisma.deck.findFirst({
                where: {
                    ownerId: ctx.session.user.id,
                    name: input.name,
                },
            });
            if (exists) {
                const deckCount = await prisma.deck.count({
                    where: {
                        ownerId: ctx.session.user.id,
                    },
                });
                if (deckCount >= 20) throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only have up to 20 decks' });
            }

            // FIXME: check validity of deck

            const deck = await prisma.deck.upsert({
                where: {
                    ownerId_name: {
                        ownerId: ctx.session.user.id,
                        name: input.name,
                    },
                },
                update: {
                    name: input.rename,
                    cards: input.cards,
                },
                create: {
                    ownerId: ctx.session.user.id,
                    name: input.name,
                    ruleset: input.ruleset,
                    cards: input.cards,
                },
            });

            return deck;
        }),
});
