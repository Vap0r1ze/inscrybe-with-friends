import './globals.css';
import { PropsWithChildren } from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Inscrybe w/ Friends',
    description: 'A web fangame for playing Inscryption with friends, or by yourself against AI.',
};

export default function RootLayout({ children }: PropsWithChildren<{}>) {
    return (
        <html lang="en">
            <body className={inter.className}>{children}</body>
        </html>
    );
}
