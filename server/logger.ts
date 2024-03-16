import superagent from 'superagent';

export type LogContext = Partial<{
    gameId: string;
    lobbyId: string;
    userId: string;
}>;
export type LogEvent = {
    message: string;
    level?: 'info' | 'warn' | 'error' | 'debug' | 'verbose';
} & LogContext;

export const logger = {
    events: [] as LogEvent[],
    log: (message: string, { ctx, level }: { ctx?: LogContext, level?: LogEvent['level'] }) => {
        logger.events.push({ message, level, ...ctx });
    },
    info: (message: string, ctx?: LogContext) => logger.log(message, { ctx, level: 'info' }),
    warn: (message: string, ctx?: LogContext) => logger.log(message, { ctx, level: 'warn' }),
    error: (message: string, ctx?: LogContext) => logger.log(message, { ctx, level: 'error' }),
    debug: (message: string, ctx?: LogContext) => logger.log(message, { ctx, level: 'debug' }),
    verbose: (message: string, ctx?: LogContext) => logger.log(message, { ctx, level: 'verbose' }),

    flush: async () => {
        try {
            await superagent.post('https://in.logs.betterstack.com')
                .set('Authorization', 'Bearer ' + process.env.LOGTAIL_TOKEN)
                .send(logger.events);
        } catch {}
    },
};
