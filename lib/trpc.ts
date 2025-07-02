import type { AppRouter } from '@/server/trpc/router';
import { getBaseUrl, isClient } from '@/lib/utils';
import { createTRPCProxyClient, httpBatchLink, loggerLink } from '@trpc/client';
import { createTRPCNext } from '@trpc/next';
import { ssrPrepass } from '@trpc/next/ssrPrepass';
import { inferRouterOutputs } from '@trpc/server';

export const trpc = createTRPCNext<AppRouter>({
    config({ ctx }) {
        return {
            links: [
                loggerLink({
                    enabled: (opts) => {
                        if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') return true;
                        if (opts.direction === 'down' && opts.result instanceof Error) return true;
                        return false;
                    },
                }),
                httpBatchLink({
                    url: `${getBaseUrl()}/api/trpc`,
                    headers: isClient ? void 0 : () => {
                        if (!ctx?.req?.headers) return {};
                        return { ...ctx.req.headers };
                    },
                }),
            ],
        };
    },
    ssr: true,
    ssrPrepass,
});

export const trpcProxy = createTRPCProxyClient<AppRouter>({
    links: [
        httpBatchLink({
            url: `${getBaseUrl()}/api/trpc`,
        }),
    ],
});

export type RouterOutputs = inferRouterOutputs<AppRouter>;
