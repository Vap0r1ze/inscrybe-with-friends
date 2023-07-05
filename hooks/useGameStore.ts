import { Action, ActionRes, PlayerMessage } from '@/lib/engine/Actions';
import { FightHost, createTick } from '@/lib/engine/Host';
import { FightPacket, FightTick, handleAction, handleEvents, handleResponse, startGame, translatePacket } from '@/lib/engine/Tick';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useClientStore } from './useClientStore';
import { clone, shuffle } from '@/lib/utils';
import { FightSide } from '@/lib/engine/Fight';
import { Event, translateEvent } from '@/lib/engine/Events';
import { pick } from 'lodash';
import { trpcProxy } from '@/lib/trpc';

interface LocalGame {
    host: FightHost,
    forceTranslate?: FightSide,
}
interface CloudGame {
    playedInit: boolean,
}
interface GameStore {
    localGames: Partial<Record<string, LocalGame>>,
    newLocalGame(gameId: string, host: FightHost): void,
    setLocalGame(gameId: string, mutator: (state: LocalGame) => LocalGame): void,
    saveHost(gameId: string): void,
    deleteLocalGame(gameId: string): void,

    createTick(gameId: string): FightTick,
    startHost(gameId: string): Promise<void>,
    sendLocalAction(gameId: string, action: Action): Promise<void>,
    sendLocalResponse(gameId: string, res: ActionRes): Promise<void>,
    createEvent(gameId: string, event: Event): Promise<void>,

    cloudGames: Partial<Record<string, CloudGame>>,
    newCloudGame(gameId: string): void,
    getCloudGame(gameId: string, createIfNone: true): CloudGame,
    getCloudGame(gameId: string, createIfNone?: boolean): CloudGame | null,
    setCloudGame(gameId: string, mutator: (state: CloudGame) => CloudGame): void,
    deleteCloudGame(gameId: string): void,
    handleCloudPacket(gameId: string, packet: FightPacket): void,

    sendPlayerMessage(gameId: string, message: PlayerMessage): Promise<void>,
}

export const useGameStore = create(
    persist<GameStore>(
        (set, get) => ({
            // Local Game
            localGames: {},
            saveHost: (gameId) => {
                const game = get().localGames[gameId];
                if (!game) throw new Error('Missing local game!');
                get().setLocalGame(gameId, oldGame => ({ ...oldGame, host: clone(game.host) }));
            },
            newLocalGame: (gameId, host) => set(state => ({ localGames: { ...state.localGames, [gameId]: { host } } })),
            setLocalGame: (gameId, mutator) => set(state => {
                const game = state.localGames[gameId];
                if (!game) return state;
                return { localGames: { ...state.localGames, [gameId]: mutator(game) } };
            }),
            deleteLocalGame: (gameId) => set(state => {
                const games = { ...state.localGames };
                delete games[gameId];
                return { localGames: games };
            }),

            createTick: (gameId) => {
                const host = get().localGames[gameId]?.host;
                if (!host) throw new Error('Missing local game!');
                return createTick(host, {
                    adapter: {
                        async initDeck(side, deck) {
                            const idxs = this.fight.decks[side][deck].map((_, idx) => idx);
                            return shuffle(idxs);
                        },
                    },
                    logger: {
                        error: (message) => console.error(`[${gameId}] ${message}`),
                        debug: (message) => console.debug(`[${gameId}] ${message}`),
                        info: (message) => console.info(`[${gameId}] ${message}`),
                        warn: (message) => console.warn(`[${gameId}] ${message}`),
                    },
                });
            },
            startHost: async (gameId) => {
                const game = get().localGames[gameId]!;
                const tick = get().createTick(gameId);
                if (!tick) throw new Error('Missing server!');
                const side = game.forceTranslate ?? 'player';
                const packet = translatePacket(await startGame(tick), side);
                get().saveHost(gameId);
                useClientStore.getState().addPacket(gameId, packet);
            },
            sendLocalAction: async (gameId, action) => {
                const game = get().localGames[gameId]!;
                const tick = get().createTick(gameId);
                if (!tick) throw new Error('Missing server!');
                const side = game.forceTranslate ?? 'player';
                const packet = translatePacket(await handleAction(tick, side, action), side);
                get().saveHost(gameId);
                useClientStore.getState().addPacket(gameId, packet);
            },
            sendLocalResponse: async (gameId, res) => {
                const game = get().localGames[gameId]!;
                const tick = get().createTick(gameId);
                if (!tick) throw new Error('Missing server!');
                const side = game.forceTranslate ?? 'player';
                const packet = translatePacket(await handleResponse(tick, side, res), side);
                get().saveHost(gameId);
                useClientStore.getState().addPacket(gameId, packet);
            },
            createEvent: async (gameId, event) => {
                const game = get().localGames[gameId]!;
                const tick = get().createTick(gameId);
                if (!tick) throw new Error('Missing server!');
                const side = game.forceTranslate ?? 'player';
                const packet = translatePacket(await handleEvents(tick, [translateEvent(event, side, false)]), side);
                get().saveHost(gameId);
                useClientStore.getState().addPacket(gameId, packet);
            },

            // Cloud Game
            cloudGames: {},
            newCloudGame: (gameId) => set(state => ({
                cloudGames: {
                    ...state.cloudGames,
                    [gameId]: { playedInit: false },
                },
            })),
            getCloudGame: ((gameId, createIfNone) => {
                const game = get().cloudGames[gameId] ?? null;
                if (!game && createIfNone) {
                    get().newCloudGame(gameId);
                    return get().cloudGames[gameId]!;
                }
                return game;
            }) as GameStore['getCloudGame'],
            setCloudGame: (gameId, mutator) => set(state => {
                const game = state.cloudGames[gameId];
                if (!game) return state;
                return { ...state, cloudGames: { ...state.cloudGames, [gameId]: mutator(game) } };
            }),
            deleteCloudGame: (gameId) => set(state => {
                const games = { ...state.cloudGames };
                delete games[gameId];
                return { ...state, cloudGames: games };
            }),
            handleCloudPacket: (gameId, packet) => {
                const game = get().cloudGames[gameId];
                // TODO: use packet id as nonce
                if (!game) return;
                if (!game.playedInit) get().setCloudGame(gameId, oldGame => ({ ...oldGame, playedInit: true }));
                useClientStore.getState().addPacket(gameId, packet);
            },

            // All
            sendPlayerMessage: (gameId, message) => {
                const state = get();
                if (state.localGames[gameId]) {
                    return message.type === 'action'
                        ? state.sendLocalAction(gameId, message.action)
                        : state.sendLocalResponse(gameId, message.res);
                } else if (state.cloudGames[gameId]) {
                    return trpcProxy.game.actionMessage.mutate({
                        gameId,
                        data: message,
                    });
                }
                throw new Error('Missing game!');
            },
        }),
        {
            name: 'games',
            storage: createJSONStorage(() => localStorage),
            partialize: state => pick(state, ['localGames', 'cloudGames']) as GameStore,
        },
    )
);
