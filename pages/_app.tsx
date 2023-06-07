import '@/styles/globals.css';
import Filters from '@/components/Filters';
import styles from './app.module.css';
import { SessionProvider } from 'next-auth/react';
import { AppProps } from 'next/app';
import { Text } from '@/components/ui/Text';
import { Rulebook } from '@/components/Rulebook';
import { Settings } from '@/components/Settings';
import version from '../version.js';
import * as Tone from 'tone';

export default function App({ Component, pageProps }: AppProps) {
    return <div className={styles.app} onClick={() => Tone.start()}>
        <SessionProvider>
            <Component {...pageProps} />
        </SessionProvider>
        <Rulebook />
        <Settings />
        <Filters />
        <div className={styles.version}>
            <Text>{version}</Text>
        </div>
    </div>;
}
