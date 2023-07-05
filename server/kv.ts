import { FightSide } from '@/lib/engine/Fight';
import { FightHost } from '@/lib/engine/Host';
import { zFightSides, zPlayerDecks } from '@/lib/online/z';
import { entries } from '@/lib/utils';
import { RedisClientType, createClient } from 'redis';

const globalForRedis = global as unknown as {
    redis?: RedisClientType
    redisConnected?: WeakSet<RedisClientType>
};

export const redis = globalForRedis.redis ?? createClient({
    url: process.env.REDIS_URL,
});

if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redis;
}

if (!globalForRedis.redisConnected?.has(redis)) {
    globalForRedis.redisConnected ??= new WeakSet();
    globalForRedis.redisConnected.add(redis);
    redis.on('error', (error) => {
        if (error.message === 'Socket closed unexpectedly') return;
        if (error.code === 'ENOTFOUND') return console.log('⚠️ DNS lookup failed for Redis, retrying...');
        console.error('❌ Redis error:', error);
    });
    redis.connect();
}

const k = {
    lobbySides: (lobbyId: string) => `lobby:${lobbyId}:sides`,
    lobbyDecks: (lobbyId: string) => `lobby:${lobbyId}:decks`,
    lobbyGame: (lobbyId: string) => `lobby:${lobbyId}:game`,
    gameLobby: (lobbyId: string) => `game:${lobbyId}:lobby`,
    gameHost: (gameId: string) => `game:${gameId}:host`,
    gameSides: (gameId: string) => `game:${gameId}:sides`,
};

export const kv = {
    // Lobby
    getLobbySides: async (lobbyId: string) => zFightSides.partial().catch({}).parse(await redis.hGetAll(k.lobbySides(lobbyId))),
    getLobbyDecks: async (lobbyId: string) => zPlayerDecks.catch({}).parse(await redis.hGetAll(k.lobbyDecks(lobbyId))),
    getLobbyGame: async (lobbyId: string) => await redis.get(k.lobbyGame(lobbyId)),

    setLobbySide: async (lobbyId: string, side: FightSide, userId: string | null) => {
        if (userId) await redis.hSet(k.lobbySides(lobbyId), side, userId);
        else await redis.hDel(k.lobbySides(lobbyId), side);
    },
    setLobbyDeck: async (lobbyId: string, userId: string, deckId: string) => await redis.hSet(k.lobbyDecks(lobbyId), userId, deckId),
    setLobbyGame: async (lobbyId: string, gameId: string | null) => {
        if (!gameId) await redis.multi()
            .del(k.lobbyGame(lobbyId))
            .exec();
        else await redis.multi()
            .set(k.lobbyGame(lobbyId), gameId)
            .exec();
    },

    flushLobby: async (lobbyId: string) => {
        const gameId = await redis.get(k.lobbyGame(lobbyId));
        if (gameId) await kv.flushGame(gameId);
        await redis.multi()
            .del(k.lobbySides(lobbyId))
            .del(k.lobbyDecks(lobbyId))
            .del(k.lobbyGame(lobbyId))
            .exec();
    },
    flushLobbyPlayer: async (lobbyId: string, userId: string) => {
        const sides = await kv.getLobbySides(lobbyId);
        let gameEnded = false;
        const hostJson = await redis.exists(k.gameHost(lobbyId));
        let multi = redis.multi();
        for (const [side, user] of entries(sides)) if (user === userId) {
            multi = multi.hDel(k.lobbySides(lobbyId), side);
            if (hostJson) gameEnded = true;
        }
        multi = multi.hDel(k.lobbyDecks(lobbyId), userId);
        await multi.exec();
        return { gameEnded };
    },

    // Game
    getHost: async (gameId: string) => {
        const hostJson = await redis.get(k.gameHost(gameId));
        if (!hostJson) return null;

        try {
            const hostParsed = JSON.parse(hostJson);
            // FIXME: create zFightHost
            return hostParsed as FightHost;
        } catch {
            return null;
        }
    },
    getGameSides: async (gameId: string) => zFightSides.nullable().catch(null).parse(await redis.hGetAll(k.gameSides(gameId))),

    setHost: async (gameId: string, host: FightHost) => {
        await redis.set(k.gameHost(gameId), JSON.stringify(host));
    },
    setGameSides: async (gameId: string, sides: Record<FightSide, string>) => {
        await redis.hSet(k.gameSides(gameId), sides);
    },

    flushGame: async (gameId: string) => {
        await redis.multi()
            .del(k.gameHost(gameId))
            .del(k.gameSides(gameId))
            .exec();
    },
};
