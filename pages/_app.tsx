import '@/styles/globals.css';
import Filters from '@/components/Filters';
import styles from './app.module.css';
import { SessionProvider, signIn } from 'next-auth/react';
import { AppType } from 'next/app';
import { Text } from '@/components/ui/Text';
import { Rulebook } from '@/components/Rulebook';
import version from '../version.js';
import * as Tone from 'tone';
import { trpc } from '@/lib/trpc';
import { isClient } from '@/lib/utils';
import { Navbar } from '@/components/nav/Navbar';
import { pusherClient } from '@/lib/pusher';

const App: AppType<{ session: any }> = ({ Component, pageProps, ...appProps }) => {
    if (appProps.router.pathname.startsWith('/auth/')) {
        return <SessionProvider>
            <Component {...pageProps} />
        </SessionProvider>;
    }

    if (/^\/play(?:\/|$)/.test(appProps.router.pathname)) {
        const { data: session } = trpc.user.getSession.useQuery(void 0, {
            refetchOnWindowFocus: false,
        });

        if (isClient && !session) {
            signIn('discord');
            return <div></div>;
        }

        if (isClient) {
            // @ts-ignore
            window.pusherClient = pusherClient;
            pusherClient.signin();
        };

        return <div className={styles.play} onClick={() => Tone.start()}>
            <SessionProvider>
                <div className={styles.main}>
                    <Component {...pageProps} />
                </div>
                <Navbar className={styles.nav} />
                <Rulebook />
            </SessionProvider>
            <Filters />
            <div className={styles.version}>
                <Text>{version}</Text>
            </div>
        </div>;
    }

    return <div className={styles.app} onClick={() => Tone.start()}>
        <SessionProvider>
            <Component {...pageProps} />
        </SessionProvider>
    </div>;
};

export default trpc.withTRPC(App);
