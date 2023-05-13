import NextAuth, { AuthOptions } from 'next-auth';
import { provider, adapter } from '@/lib/auth';

const authOptions: AuthOptions = {
    providers: [
        provider({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
        }),
    ],
    adapter,
    callbacks: {
        signIn({ profile }) {
            return profile?.['verified'] || '/auth/error?error=not_verified';
        },
    },
    pages: {
        signIn: '/auth/signin',
        error: '/auth/internal-error',
        signOut: '/auth/signout',
    }
};

export default NextAuth(authOptions);
