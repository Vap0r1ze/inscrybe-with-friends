declare namespace NodeJS {
    interface ProcessEnv {
        DISCORD_CLIENT_ID: string;
        DISCORD_CLIENT_SECRET: string;

        PUSHER_APP_ID: string;
        PUSHER_SECRET: string;
        NEXT_PUBLIC_PUSHER_KEY: string;
        NEXT_PUBLIC_PUSHER_CLUSTER: string;

        CRON_SECRET: string;
    }
}

type Writeable<T> = { -readonly [P in keyof T]: T[P] };
type OmitNever<T> = Pick<T, { [K in keyof T]: T[K] extends never ? never : K }[keyof T]>;
type Extends<T, U extends T> = T extends U ? true : false;

declare module '*.lua' {
    const content: string;
    export default content;
}
