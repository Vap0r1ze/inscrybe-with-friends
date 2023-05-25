import '@/styles/globals.css';
import Filters from '@/components/Filters';
import styles from '@/styles/app.module.css';
import { SessionProvider } from 'next-auth/react';
import { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
    return <div className={styles.app}>
        <SessionProvider>
            <Component {...pageProps} />
        </SessionProvider>
        <Filters />
    </div>;
}
