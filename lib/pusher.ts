import PusherClient from 'pusher-js';
import { trpcProxy } from './trpc';
import type { GameEndMessage, UserGamePacket } from '@/server/pusher';
import { FightPacket } from './engine/Tick';

export const pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    channelAuthorization: {
        endpoint: '',
        transport: 'ajax',
        customHandler: async (channelInfo, callback) => {
            trpcProxy.pusher.authorize.query(channelInfo)
                .then(auth => callback(null, auth))
                .catch(err => callback(err, null));
        },
    },
    userAuthentication: {
        endpoint: '',
        transport: 'ajax',
        customHandler: async ({ socketId }, callback) => {
            trpcProxy.pusher.authenticate.query({ socketId })
                .then(auth => callback(null, auth))
                .catch(err => callback(err, null));
        },
    },
});

export function subscribeGamePacket(gameId: string, onPacket: (packet: FightPacket) => void) {
    const listener = (data: UserGamePacket) => {
        if (data.gameId === gameId) onPacket(data.packet);
    };
    pusherClient.user.bind('game-packet', listener);
    return () => void pusherClient.user.unbind('game-packet', listener);
}

export function subscribeGameEnd(gameId: string, onEnd: (message: string) => void) {
    const listener = (data: GameEndMessage) => {
        if (data.gameId === gameId) onEnd(data.message);
    };
    pusherClient.user.bind('game-end', listener);
    return () => void pusherClient.user.unbind('game-end', listener);
}
