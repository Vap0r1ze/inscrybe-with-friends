import { createNextApiHandler } from '@trpc/server/adapters/next';
import { createContext } from '@/server/trpc';
import { trpcRouter } from '@/server/trpc/router';

export default createNextApiHandler({
    router: trpcRouter,
    createContext,

    onError({ error, type, path, input, ctx, req }) {
        if (error.code === 'UNAUTHORIZED') return;
        if (error.code === 'NOT_FOUND') return;
        console.error(`❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`);
        if (error.code === 'INTERNAL_SERVER_ERROR') {
            // send to bug reporting
        }
    },
});
