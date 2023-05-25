import { Card } from './Card';
import { fromEntries } from '../utils';
import { Action, ActionReq, ActionRes } from './Actions';
import { Event } from './Events';

export enum FightFeatures {
    Anticipated = 'anticipated',
    EarlyPlay = 'early-play',
    Rotary = 'rotary',
}

export type FightSide = 'player' | 'opposing';
export type DeckType = 'main' | 'side';
export type Phase = 'pre-turn' | 'draw' | 'play' | 'pre-attack' | 'attack' | 'post-attack';
export type FightTurn = {
    side: FightSide;
    phase: Phase;
};

export interface FightOptions {
    lanes: number;
    features: FightFeatures[];
    startingHand: number;
    lives: number;
    hammersPerTurn: number;
}

export interface Fight<InclSide extends FightSide = never> {
    opts: FightOptions;
    points: Record<FightSide, number>;
    turn: FightTurn;
    backlog?: Event[];
    waitingFor: {
        side: FightSide;
        req: ActionReq;
        event: Event;
        sigil: string;
    } | null;
    field: Record<FightSide, (Card | null)[]>;
    players: Record<FightSide, PlayerState>;

    hands: Record<InclSide, Card[]>;
    decks: Record<InclSide, Record<DeckType, number[]>>;
}

export interface PlayerState {
    lives: number;
    bones: number;
    energy: [number, number];
}

const initPlayerState = (lives: number): PlayerState => ({
    lives,
    bones: 0,
    energy: [0, 0],
});

export function createFight<Side extends FightSide = never>(opts: FightOptions, sides: Side[]): Fight<Side> {
    const hands = fromEntries(sides.map(side => [side, []]));
    const decks = fromEntries(sides.map(side => [side, {
        main: [],
        side: [],
    }]));
    return {
        opts,
        points: { player: 0, opposing: 0 },
        turn: { side: 'player', phase: 'pre-turn' },
        waitingFor: null,
        field: {
            player: Array(opts.lanes).fill(null),
            opposing: Array(opts.lanes).fill(null),
        },
        hands,
        decks,
        players: {
            player: initPlayerState(opts.lives),
            opposing: initPlayerState(opts.lives),
        },
    };
}

export const FIGHT_SIDES: FightSide[] = ['player', 'opposing'];
