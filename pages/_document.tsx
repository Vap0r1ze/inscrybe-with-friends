import { Html, Head, Main, NextScript } from 'next/document';
export const metadata = {
    title: 'Inscrybe w/ Friends',
    description: 'A web fangame for playing Inscryption with friends, or by yourself against AI.',
};

export default function Document() {
    return (
        <Html lang="en">
            <Head>
                <link rel="preload" href="/fonts/gbc.otf" as="font" type="font/otf" crossOrigin="anonymous"/>
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}


