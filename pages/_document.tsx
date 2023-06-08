import { Html, Head, Main, NextScript } from 'next/document';
export const metadata = {
    title: 'Inscrybe w/ Friends',
    description: 'A web fangame for playing Inscryption with friends, or by yourself against AI.',
};

export default function Document() {
    return (
        <Html lang="en">
            <Head>
                <link rel="icon" href="/icon.png" sizes="any" />
                <link rel="preload" href="/fonts/Marksman.woff" as="font" type="font/woff" crossOrigin="anonymous"/>
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}


