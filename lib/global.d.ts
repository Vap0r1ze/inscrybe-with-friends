declare namespace NodeJS {
    interface ProcessEnv {
        DISCORD_CLIENT_ID: string;
        DISCORD_CLIENT_SECRET: string;

        PUSHER_APP_ID: string;
        PUSHER_KEY: string;
        PUSHER_SECRET: string;
        PUSHER_CLUSTER: string;

        HCAPTCHA_SECRET: string;
        HCAPTCHA_SITEKEY: string;
    }
}

type Writeable<T> = { -readonly [P in keyof T]: T[P] };
type OmitNever<T> = Pick<T, { [K in keyof T]: T[K] extends never ? never : K }[keyof T]>;
