import { Action, ActionRes } from '@/lib/engine/Actions';
import { FightHost, createTick } from '@/lib/engine/Host';
import { FightPacket, FightTick, handleAction, handleEvents, handleResponse, startGame } from '@/lib/engine/Tick';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useClientStore } from './useClientStore';
import { clone, shuffle } from '@/lib/utils';
import { FightSide } from '@/lib/engine/Fight';
import { Event, translateEvent } from '@/lib/engine/Events';
import { pick } from 'lodash';

interface LocalGame {
    host: FightHost,
    forceTranslate?: FightSide,
}
interface GameStore {
    games: Partial<Record<string, LocalGame>>,
    newGame: (gameId: string, host: FightHost) => void,
    setGame: (gameId: string, mutator: (state: LocalGame) => LocalGame) => void,
    saveHost: (gameId: string) => void,
    deleteGame: (gameId: string) => void,

    createTick: (gameId: string) => FightTick,
    startHost: (gameId: string) => Promise<void>,
    sendAction: (gameId: string, action: Action) => Promise<void>,
    sendResponse: (gameId: string, res: ActionRes) => Promise<void>,
    createEvent: (gameId: string, event: Event) => Promise<void>,
}

export const useGameStore = create(
    persist<GameStore>(
        (set, get) => ({
            games: {},
            saveHost: (gameId) => {
                const game = get().games[gameId];
                if (!game) throw new Error('Missing game!');
                get().setGame(gameId, oldGame => ({ ...oldGame, host: clone(game.host) }));
            },
            newGame: (gameId, host) => set(state => ({ games: { ...state.games, [gameId]: { host } } })),
            setGame: (gameId, mutator) => set(state => {
                const game = state.games[gameId];
                if (!game) return state;
                return { games: { ...state.games, [gameId]: mutator(game) } };
            }),
            deleteGame: (gameId) => set(state => {
                const games = { ...state.games };
                delete games[gameId];
                return { games };
            }),

            createTick: (gameId) => {
                const host = get().games[gameId]?.host;
                if (!host) throw new Error('Missing game!');
                return createTick(host, {
                    async initDeck(side, deck) {
                        const idxs = this.fight.decks[side][deck].map((_, idx) => idx);
                        return shuffle(idxs);
                    },
                });
            },
            startHost: async (gameId) => {
                const game = get().games[gameId]!;
                const tick = get().createTick(gameId);
                if (!tick) throw new Error('Missing server!');
                const side = game.forceTranslate ?? 'player';
                const packet = translatePacket(side, await startGame(tick));
                get().saveHost(gameId);
                useClientStore.getState().addPacket(gameId, packet);
            },
            sendAction: async (gameId, action) => {
                const game = get().games[gameId]!;
                const tick = get().createTick(gameId);
                if (!tick) throw new Error('Missing server!');
                const side = game.forceTranslate ?? 'player';
                const packet = translatePacket(side, await handleAction(tick, side, action));
                get().saveHost(gameId);
                useClientStore.getState().addPacket(gameId, packet);
            },
            sendResponse: async (gameId, res) => {
                const game = get().games[gameId]!;
                const tick = get().createTick(gameId);
                if (!tick) throw new Error('Missing server!');
                const side = game.forceTranslate ?? 'player';
                const packet = translatePacket(side, await handleResponse(tick, side, res));
                get().saveHost(gameId);
                useClientStore.getState().addPacket(gameId, packet);
            },
            createEvent: async (gameId, event) => {
                const game = get().games[gameId]!;
                const tick = get().createTick(gameId);
                if (!tick) throw new Error('Missing server!');
                const side = game.forceTranslate ?? 'player';
                const packet = translatePacket(side, await handleEvents(tick, [translateEvent(event, side, false)]));
                get().saveHost(gameId);
                useClientStore.getState().addPacket(gameId, packet);
            },
        }),
        {
            name: 'games',
            storage: createJSONStorage(() => localStorage),
            partialize: state => pick(state, ['games']) as GameStore,
        },
    )
);

function translatePacket(side: FightSide, packet: FightPacket) {
    packet = clone(packet);
    const { settled } = packet;
    packet.settled = [];
    for (let i = 0; i < settled.length; i++) {
        const translated = translateEvent(settled[i], side);
        if (translated) packet.settled.push(translated);
    }
    return packet;
}
