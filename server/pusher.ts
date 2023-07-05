import { FightPacket } from '@/lib/engine/Tick';
import PusherServer from 'pusher';

export const pusherServer = new PusherServer({
    appId: process.env.PUSHER_APP_ID,
    secret: process.env.PUSHER_SECRET,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    useTLS: true,
});

export function triggerLobbyRefetch(lobbyId: string, fromUser?: string) {
    pusherServer.trigger(`private-lobby@${lobbyId}`, 'refetch', {
        from: fromUser,
    });
}
export function triggerLobbyGameStart(lobbyId: string) {
    pusherServer.trigger(`private-lobby@${lobbyId}`, 'game-start', {});
}

export function triggerFightPacket(toUser: string, gameId: string, packet: FightPacket) {
    pusherServer.sendToUser(toUser, 'game-packet', {
        gameId,
        packet,
    } satisfies UserGamePacket);
}

export function triggerGameEnd(toUser: string, gameId: string, message: string) {
    pusherServer.sendToUser(toUser, 'game-end', {
        gameId,
        message,
    } satisfies GameEndMessage);
}

export type LobbyGameEnd = {
    message: string;
};

export type UserGamePacket = {
    gameId: string;
    packet: FightPacket;
};

export type GameEndMessage = {
    gameId: string;
    message: string;
};
