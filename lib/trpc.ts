import type { AppRouter } from '@/server/trpc/router';
import { getBaseUrl, isClient } from '@/lib/utils';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { createTRPCNext } from '@trpc/next';
import { inferRouterOutputs } from '@trpc/server';

export const trpc = createTRPCNext<AppRouter>({
    config({ ctx }) {
        return {
            links: [
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
});

export const trpcProxy = createTRPCProxyClient<AppRouter>({
    links: [
        httpBatchLink({
            url: `${getBaseUrl()}/api/trpc`,
        }),
    ],
});

export type RouterOutputs = inferRouterOutputs<AppRouter>;
