import NextAuth, { NextAuthOptions } from 'next-auth';
import { provider, adapter } from '@/server/auth';

export const authOptions: NextAuthOptions = {
    providers: [
        provider({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
        }),
    ],
    adapter,
    callbacks: {
        signIn({ profile }) {
            // @ts-ignore
            return profile?.['verified'] || '/auth/error?error=not_verified';
        },
        session({ session, user }: any) {
            if (session.user) {
                session.user.id = user.id;
            }
            return session;
        },
    },
    pages: {
        signIn: '/auth/signin',
        error: '/auth/internal-error',
        signOut: '/auth/signout',
    },
};

export default NextAuth(authOptions);
