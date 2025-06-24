import { Adapter, AdapterUser } from 'next-auth/adapters';
import { redis } from '@/server/kv';
import { prisma } from '@/server/db';
import { User } from '@prisma/client';

const toAdapterUser = (user: Pick<User, 'id' | 'name' | 'image'>): AdapterUser => ({
    id: user.id,
    name: user.name,
    image: user.image,
    email: '',
    emailVerified: null,
});
export const adapter: Adapter = {
    async createUser(userInfo) {
        const user = { name: userInfo.name!, image: userInfo.image! };
        const { id } = await prisma.user.create({ data: user });

        return toAdapterUser({ id, ...user });
    },
    async getUser(id) {
        const user = await prisma.user.findFirst({ where: { id } });

        return user ? toAdapterUser(user) : null;
    },
    async getUserByEmail(email) {
        return null;
    },
    async getUserByAccount({ providerAccountId, provider }) {
        const connection = await prisma.connection.findFirst({ where: { connectionId: providerAccountId, provider } });

        if (!connection) return null;

        const user = await prisma.user.findFirst({ where: { id: connection.userId } });
        if (!user) return null;

        return toAdapterUser(user);
    },
    async updateUser({ id, ...user }) {
        if (id == null) throw new Error('Missing user ID');

        const newUser = await prisma.user.update({ where: { id }, data: {
            name: user.name ?? undefined,
            image: user.image ?? undefined,
        } });

        return toAdapterUser(newUser);
    },
    async deleteUser(userId) {
        // TODO
        return;
    },
    async linkAccount(account) {
        const pks = {
            userId: account.userId,
            provider: account.provider,
        };
        const meta = {
            connectionId: account.providerAccountId,
            token: account.refresh_token!,
        };
        await prisma.connection.upsert({
            where: { userId_provider: pks },
            update: meta,
            create: { ...pks, ...meta },
        });
    },
    async unlinkAccount({ providerAccountId, provider }) {
        // TODO
        return;
    },
    async createSession({ sessionToken, userId, expires }) {
        await redis.set(`session:${sessionToken}`, userId, { PXAT: expires.getTime() });
        return { sessionToken, userId, expires };
    },
    async getSessionAndUser(sessionToken) {
        const userId = await redis.get(`session:${sessionToken}`);
        if (!userId) return null;

        const expiresIn = await redis.pTTL(`session:${sessionToken}`);
        if (expiresIn === -2) return null;

        const session = { sessionToken, userId, expires: new Date(Date.now() + expiresIn) };

        const user = await prisma.user.findFirst({ where: { id: userId } });

        return user ? { session, user: toAdapterUser(user) } : null;
    },
    async updateSession({ sessionToken, ...session }) {
        const setOptions = session.expires ? { PXAT: session.expires.getTime() } : {};
        const oldId = await redis.get(`session:${sessionToken}`);

        if (!oldId && !session.userId) return;
        const userId = (session.userId ?? oldId) as string;

        await redis.set(`session:${sessionToken}`, userId, setOptions);

        let expiresIn = await redis.pTTL(`session:${sessionToken}`);
        return { sessionToken, userId, expires: new Date(Date.now() + expiresIn) };
    },
    async deleteSession(sessionToken) {
        await redis.del(`session:${sessionToken}`);
        return;
    },
};
