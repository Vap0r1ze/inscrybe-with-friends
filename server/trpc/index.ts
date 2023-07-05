import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { TRPCError, inferAsyncReturnType, initTRPC } from '@trpc/server';
import { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { unstable_getServerSession } from 'next-auth';
import { redis } from '../kv';
import decrOrDel from '../redis/decrOrDel.lua';

type Session = {
    user: {
        name: string;
        image: string;
        id: string;
    };
    expires: string;
};
export const createContext = async (opts: CreateNextContextOptions) => {
    const session = await unstable_getServerSession(opts.req, opts.res, authOptions) as Session | null;

    return {
        session,
    };
};

export type Context = inferAsyncReturnType<typeof createContext>;
const t = initTRPC.context<Context>().create({
    errorFormatter({ shape }) {
        return shape;
    },
});

const isAuthed = t.middleware(({ next, ctx, path }) => {
    if (!ctx.session?.user.id) {
        throw new TRPCError({
            code: 'UNAUTHORIZED',
        });
    }
    console.log('[trpc] %s', path);
    return next({
        ctx: {
            session: ctx.session,
        },
    });
});

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);

export async function upConcurrency(key: string, max: number, onMax: () => void) {
    const wholeKey = `concurrency:${key}`;
    const count = +(await redis.get(wholeKey) ?? 0);
    if (count > max) onMax();

    await redis.incr(wholeKey);
};

export async function downConcurrency(key: string) {
    const wholeKey = `concurrency:${key}`;
    await redis.eval(decrOrDel, { keys: [wholeKey] });
}
