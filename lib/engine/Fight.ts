import { Card } from './Card';
import { fromEntries } from '../utils';
import { ActionReq } from './Actions';
import { DECK_TYPES, DeckType, DeckCards } from './Deck';

export enum FightFeatures {
    Anticipated = 'anticipated',
    EarlyPlay = 'early-play',
    Rotary = 'rotary',
}

export const FIGHT_SIDES = ['player', 'opposing'] as const;
export type FightSide = typeof FIGHT_SIDES[number];
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
    ruleset: string;
}

export interface Fight<InclSide extends FightSide = never> {
    opts: FightOptions;
    points: Record<FightSide, number>;
    turn: FightTurn;
    waitingFor: {
        side: FightSide;
        req: ActionReq;
    } | null;
    field: Record<FightSide, (Card | null)[]>;
    players: Record<FightSide, PlayerState>;

    // TODO: Move private per-player state to a single key
    mustPlay: Record<InclSide, number | null>;
    hands: Record<InclSide, Card[]>;
    decks: Record<InclSide, DeckCards>;
}

export interface PlayerState {
    deaths: number;
    bones: number;
    energy: [number, number];
    deckSizes: Record<DeckType, number>;
    handSize: number;
    turnHammers: number;
}

const initPlayerState = (): PlayerState => ({
    deaths: 0,
    bones: 0,
    energy: [0, 0],
    deckSizes: fromEntries(DECK_TYPES.map(type => [type, 0])),
    handSize: 0,
    turnHammers: 0,
});

export function createFight<Side extends FightSide = never>(opts: FightOptions, sides: readonly Side[], decks: Record<Side, DeckCards>): Fight<Side> {
    const hands = fromEntries(sides.map(side => [side, []]));
    const mustPlay = fromEntries(sides.map(side => [side, null]));
    return {
        opts,
        points: { player: 0, opposing: 0 },
        turn: { side: 'player', phase: 'pre-turn' },
        waitingFor: null,
        field: {
            player: Array(opts.lanes).fill(null),
            opposing: Array(opts.lanes).fill(null),
        },
        players: {
            player: initPlayerState(),
            opposing: initPlayerState(),
        },
        hands,
        mustPlay,
        decks,
    };
}

export function translateFight<Side extends FightSide>(hostFight: Fight<FightSide>, side: Side): Fight<'player'> {
    const { opts, points, turn, waitingFor, field, players, mustPlay, hands, decks } = hostFight;
    const opposingSide = side === 'player' ? 'opposing' : 'player';
    return {
        opts,
        points: {
            player: points[side],
            opposing: points[opposingSide],
        },
        turn: turn.side === side ? { ...turn, side: 'player' } : { ...turn, side: 'opposing' },
        waitingFor: waitingFor && {
            side: waitingFor.side === side ? 'player' : 'opposing',
            req: waitingFor.req,
        },
        field: {
            player: field[side],
            opposing: field[opposingSide],
        },
        players: {
            player: players[side],
            opposing: players[opposingSide],
        },
        mustPlay: {
            player: mustPlay[side],
        },
        hands: {
            player: hands[side],
        },
        decks: {
            player: decks[side],
        },
    };
}
