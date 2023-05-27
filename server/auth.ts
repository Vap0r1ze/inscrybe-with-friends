import { Adapter, AdapterUser } from 'next-auth/adapters';
import { OAuthConfig, OAuthUserConfig } from 'next-auth/providers';
import { Selectable } from 'kysely';
import kv from '@vercel/kv';
import { User, db } from './db';
import { pick } from 'lodash';

export interface DiscordProfile {
    id: string
    username: string
    display_name: string
    discriminator: string
    avatar: string
    verified: boolean
}

export function getDiscordImage(profile: DiscordProfile) {
    return profile.avatar
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${profile.avatar.startsWith('a_') ? 'gif' : 'png'}`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(profile.discriminator) % 5}.png`;
};

export function provider<P extends DiscordProfile>(
    options: OAuthUserConfig<P>
): OAuthConfig<P> {
    return {
        id: 'discord',
        name: 'Discord',
        type: 'oauth',
        authorization: 'https://discord.com/api/oauth2/authorize?scope=identify',
        token: 'https://discord.com/api/oauth2/token',
        userinfo: 'https://discord.com/api/users/@me',
        profile(profile) {
            return {
                id: profile.id,
                name: profile.display_name || profile.username,
                image: getDiscordImage(profile),
            };
        },
        options,
    };
}

const toAdapterUser = (user: Pick<Selectable<User>, 'id' | 'name' | 'image'>): AdapterUser => ({
    id: user.id.toString(),
    name: user.name,
    image: user.image,
    email: '',
    emailVerified: null,
});
export const adapter: Adapter = {
    async createUser(userInfo) {
        const user = { name: userInfo.name!, image: userInfo.image! };
        const { id } = await db.insertInto('users')
            .values(user)
            .returning('id')
            .executeTakeFirstOrThrow();

        return toAdapterUser({ id, ...user });
    },
    async getUser(id) {
        const user = await db.selectFrom('users')
            .selectAll()
            .where('id', '=', parseInt(id))
            .executeTakeFirst();

        return user ? toAdapterUser(user) : null;
    },
    async getUserByEmail(email) {
        return null;
    },
    async getUserByAccount({ providerAccountId, provider }) {
        const connection = await db.selectFrom('connections')
            .selectAll()
            .where('connection_id', '=', providerAccountId)
            .where('provider', '=', provider)
            .executeTakeFirst();
        if (!connection) return null;

        const user = await db.selectFrom('users')
            .selectAll()
            .where('id', '=', connection.user_id)
            .executeTakeFirst();
        if (!user) return null;

        return toAdapterUser(user);
    },
    async updateUser({ id, ...user }) {
        await db.updateTable('users')
            .set(pick(user, ['name', 'image']) as any)
            .where('id', '=', parseInt(id))
            .executeTakeFirstOrThrow();
        const newUser = await db.selectFrom('users')
            .selectAll()
            .where('id', '=', parseInt(id))
            .executeTakeFirstOrThrow();

        return toAdapterUser(newUser);
    },
    async deleteUser(userId) {
        // TODO
        return;
    },
    async linkAccount(account) {
        const pks = {
            user_id: parseInt(account.userId),
            provider: account.provider,
        };
        const meta = {
            connection_id: account.providerAccountId,
            token: account.refresh_token!,
        };
        await db.insertInto('connections')
            .values({ ...pks, ...meta })
            .onConflict((oc) => oc.columns(['user_id', 'provider']).doUpdateSet(meta))
            .executeTakeFirstOrThrow();
    },
    async unlinkAccount({ providerAccountId, provider }) {
        // TODO
        return;
    },
    async createSession({ sessionToken, userId, expires }) {
        await kv.set(`session:${sessionToken}`, userId, { pxat: expires.getTime() });
        return { sessionToken, userId, expires };
    },
    async getSessionAndUser(sessionToken) {
        const userId = await kv.get<string>(`session:${sessionToken}`);
        if (!userId) return null;

        const expiresIn = await kv.pttl(`session:${sessionToken}`);
        if (expiresIn === -2) return null;

        const session = { sessionToken, userId, expires: new Date(Date.now() + expiresIn) };

        const user = await db.selectFrom('users')
            .selectAll()
            .where('id', '=', parseInt(userId))
            .executeTakeFirst();

        return user ? { session, user: toAdapterUser(user) } : null;
    },
    async updateSession({ sessionToken, ...session }) {
        const setOptions = session.expires ? { pxat: session.expires.getTime() } : {};
        const oldId = await kv.get<string>(`session:${sessionToken}`);

        if (!oldId && !session.userId) return;
        const userId = (session.userId ?? oldId) as string;

        await kv.set(`session:${sessionToken}`, userId, setOptions);

        let expiresIn = await kv.pttl(`session:${sessionToken}`);
        return { sessionToken, userId, expires: new Date(Date.now() + expiresIn) };
    },
    async deleteSession(sessionToken) {
        await kv.del(`session:${sessionToken}`);
        return;
    },
};
