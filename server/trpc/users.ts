import { protectedProcedure, router } from '@/server/trpc';
import { prisma } from '../db';
import { TRPCError } from '@trpc/server';

export const userRouter = router({
    getSession: protectedProcedure
        .query(async ({ ctx }) => {
            return ctx.session;
        }),
    getUser: protectedProcedure
        .query(async ({ ctx }) => {
            const user = await prisma.user.findFirst({
                where: { id: ctx.session.user.id },
            });
            if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
            return user;
        }),
});
