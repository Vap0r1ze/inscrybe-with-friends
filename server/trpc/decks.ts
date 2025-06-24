import { protectedProcedure, router } from '@/server/trpc';
import { prisma } from '../db';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { zDeckCards } from '@/lib/online/z';

export const deckRouter = router({
    getOwn: protectedProcedure
        .query(async ({ ctx }) => {
            const dbDecks = await prisma.deck.findMany({
                where: { ownerId: ctx.session.user.id },
                orderBy: { name: 'asc' },
            });

            const validDecks = dbDecks.map(deck => {
                const cards = zDeckCards.safeParse(deck.cards);
                if (cards.success) return { ...deck, cards: cards.data };
                return null;
            }).filter((maybeDeck): maybeDeck is typeof maybeDeck & {} => !!maybeDeck);

            return validDecks;
        }),
    save: protectedProcedure
        .input(z.object({
            id: z.string().optional(),
            name: z.string(),
            ruleset: z.string(),
            cards: zDeckCards,
        }))
        .mutation(async ({ ctx, input }) => {
            const exists = input.id && !!await prisma.deck.findFirst({
                where: {
                    id: input.id,
                    ownerId: ctx.session.user.id,
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

            if (input.id) {
                return await prisma.deck.upsert({
                    where: {
                        id: input.id,
                    },
                    update: {
                        name: input.name,
                        ruleset: input.ruleset,
                        cards: input.cards,
                    },
                    create: {
                        id: input.id,
                        ownerId: ctx.session.user.id,
                        name: input.name,
                        ruleset: input.ruleset,
                        cards: input.cards,
                    },
                });
            } else {
                return await prisma.deck.create({
                    data: {
                        ownerId: ctx.session.user.id,
                        name: input.name,
                        ruleset: input.ruleset,
                        cards: input.cards,
                    },
                });
            }
        }),
    delete: protectedProcedure
        .input(z.object({
            id: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            await prisma.deck.delete({
                where: {
                    id: input.id,
                    ownerId: ctx.session.user.id,
                },
            });
        }),
});
