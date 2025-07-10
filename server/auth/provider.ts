import { OAuthConfig, OAuthUserConfig } from 'next-auth/providers';
import { DiscordProfile } from './types';

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
        authorization: 'https://discord.com/api/oauth2/authorize?scope=email+identify',
        token: 'https://discord.com/api/oauth2/token',
        userinfo: 'https://discord.com/api/users/@me',
        profile(profile) {
            return {
                id: profile.id,
                name: profile.username,
                image: getDiscordImage(profile),
            };
        },
        options,
    };
}
