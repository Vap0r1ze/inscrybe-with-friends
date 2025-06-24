import { NextAuthConfig } from 'next-auth';
import { adapter } from './adapter';
import { provider } from './provider';

export const authConfig: NextAuthConfig = {
    providers: [
        provider({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
        }),
    ],
    adapter,
    callbacks: {
        signIn: async ({ account, profile }) => {
            if (account?.provider === 'discord' && !profile?.verified) {
                return '/auth/error?error=not_verified';
            }
            return true;
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
