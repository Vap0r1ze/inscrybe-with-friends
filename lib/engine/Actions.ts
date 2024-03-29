import { FightTick } from './Tick';
import { DeckType } from './Deck';

export type Action<T extends keyof ActionMap = keyof ActionMap> = T extends keyof ActionMap ? (ActionMap[T] & { type: T }) : never;
export type ActionRes<T extends keyof ResponseMap = keyof ResponseMap> = T extends keyof ResponseMap ? (ResponseMap[T] & { type: T }) : never;
export type ActionReq<T extends keyof ResponseMap = keyof ResponseMap> = T extends keyof ResponseMap ? (RequestMap[T] & { type: T }) : never;

export type PlayerMessage = {
    type: 'response',
    res: ActionRes;
} | {
    type: 'action',
    action: Action;
};

type ActionMap = {
    draw: { deck: DeckType };
    bellRing: {};
    hammer: { lane: number };
    play: { card: number; lane: number; sacs?: number[] };

    activate: { lane: number; sigil: string };
};

type ResponseMap = {
    snipe: { lane: number; };
    // bombLatch: { direction: 'opposing' | 'left' | 'right' };
    chooseDraw: { idx: number; };
};

type RequestMap = {
    snipe: {};
    bombLatch: { lane: number; };
    chooseDraw: { deck: DeckType; choices: number[]; };
};

const DRAW_ACTIONS: Action['type'][] = ['draw'];
const PLAY_ACTIONS: Action['type'][] = ['play', 'activate', 'hammer', 'bellRing'];
export function isActionInvalid(tick: FightTick, action: Action) {
    switch (tick.fight.turn.phase) {
        case 'draw':
            return !DRAW_ACTIONS.includes(action.type);
        case 'play':
            return !PLAY_ACTIONS.includes(action.type);
    }
    return false;
}
