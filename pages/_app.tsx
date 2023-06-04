import '@/styles/globals.css';
import Filters from '@/components/Filters';
import styles from './app.module.css';
import { SessionProvider } from 'next-auth/react';
import { AppProps } from 'next/app';
import { Text } from '@/components/Text';
import version from '../version.js';

export default function App({ Component, pageProps }: AppProps) {
    return <div className={styles.app}>
        <SessionProvider>
            <Component {...pageProps} />
        </SessionProvider>
        <Filters />
        <div className={styles.version}>
            <Text>{version}</Text>
        </div>
    </div>;
}
