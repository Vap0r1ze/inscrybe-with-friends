import { Fight, FightSide } from './Fight';
import { positions } from './utils';
import { Sigil } from '../defs/sigils';

// Bitfields
export const enum MoxType {
    Green = 1 << 0,
    Orange = 1 << 1,
    Blue = 1 << 2,
};
export const MOX_TYPES: Record<string, MoxType> = {
    Green: MoxType.Green,
    Orange: MoxType.Orange,
    Blue: MoxType.Blue,
};
export type SpecialStat =
    | 'ants'
    | 'hand'
    | 'bells'
    | 'moxes'
    | 'mirror';

export type Stat = SpecialStat | number;
export type Cost = {
    type: 'blood';
    amount: number;
} | {
    type: 'bone';
    amount: number;
} | {
    type: 'energy';
    amount: number;
} | {
    type: 'mox';
    needs: number;
};

export interface SideDeck {
    name: string;
    repeat?: [number, string];
}
export function getSideDeckPrintIds(sideDeck: SideDeck): string[] {
    const ids: string[] = [];
    if (sideDeck.repeat) ids.push(...Array(sideDeck.repeat[0]).fill(sideDeck.repeat[1]));
    return ids;
};

export type Trait = 'ant' | 'insect' | 'canine' | 'avian' | 'hooved' | 'reptile' | 'rodent' | 'mox' | 'bell' | 'tentacle';
export interface CardPrint {
    name: string;
    desc?: string;
    portrait?: string;
    face?: 'rare' | 'terrain' | 'rare_terrain' | 'common';
    frame?: 'nature_frame' | 'tech_frame' | 'undead_frame' | 'wizard_frame';

    fused?: boolean;
    banned?: boolean;
    rare?: boolean;
    scrybe?: 'nature' | 'tech' | 'undead' | 'wizard';

    health: number;
    power: Stat;
    cost?: Cost;
    noSac?: boolean;
    traits?: Trait[];

    sigils?: Sigil[];

    evolution?: string;
}
export interface CardState {
    power: Stat;
    health: number;
    sigils: Sigil[];
    flipped?: boolean;
    backward?: boolean;
    evolved?: boolean;
}

export type Card = {
    print: string;
    state: CardState;
};
export type CardInfo = {
    print: Readonly<CardPrint>;
    state: CardState;
};
export type FieldPos = [FightSide, number];
export type CardPos = ['field' | 'hand', [FightSide, number]];

export function initCardFromPrint(prints: Record<string, CardPrint>, printId: string): Card {
    const print = prints[printId];
    return {
        print: printId,
        state: {
            power: print.power,
            health: print.health,
            flipped: false,
            sigils: print.sigils ?? [],
        },
    };
}

export function getCardPower(prints: Record<string, CardPrint>, fight: Fight<'player'>, pos: FieldPos): number | null {
    const [side, lane] = pos;
    const card = fight.field[side][lane];
    if (card == null) return null;
    if (card.state.power === 'ants') {
        return fight.field[side].filter(card => card ? prints[card.print].traits?.includes('ant') : false).length;
    } else if (card.state.power === 'hand') {
        return fight.players[side].handSize;
    } else if (card.state.power === 'bells') {
        let power = fight.opts.lanes - lane;
        const left = fight.field[side][lane - 1];
        const right = fight.field[side][lane + 1];
        if (left && prints[left.print].traits?.includes('bell')) power++;
        if (right && prints[right.print].traits?.includes('bell')) power++;
        return power;
    } else if (card.state.power === 'mirror') {
        const opposingPos = positions.opposing(pos);
        const opposing = fight.field[opposingPos[0]][opposingPos[1]];
        if (opposing == null) return 0;
        // NOTE: https://youtu.be/lbeG5LjqCT4?t=521
        if (opposing.state.power === 'mirror') return 0;
        return getCardPower(prints, fight, opposingPos);
    } else if (card.state.power === 'moxes') {
        return fight.field[side].filter(card => card?.state.sigils.includes('gainGemGreen')).length;
    } else {
        return card.state.power;
    }
}

export function getMoxes(cards: (Card | null)[]): number {
    let moxes = 0;
    for (const card of cards) {
        if (!card) continue;
        const gainAll = card.state.sigils.includes('gainGemAll');
        if (gainAll || card.state.sigils.includes('gainGemGreen')) moxes |= MoxType.Green;
        if (gainAll || card.state.sigils.includes('gainGemOrange')) moxes |= MoxType.Orange;
        if (gainAll || card.state.sigils.includes('gainGemBlue')) moxes |= MoxType.Blue;
    }
    return moxes;
}

export function getBloods(prints: Record<string, CardPrint>, cards: (Card | null)[]): number {
    let bloods = 0;
    for (const card of cards) {
        if (!card) continue;
        const print = prints[card.print];
        if (print.noSac) continue;
        if (card.state.sigils.includes('threeSacs')) bloods += 3;
        else bloods += 1;
    }
    return bloods;
}

export function getRoomOnSac(cards: (Card | null)[]) {
    let room = 0;
    for (const card of cards) {
        if (!card) {
            room += 1;
            continue;
        };
        if (card.state.sigils.includes('manyLives')) {
            continue;
        }
        room += 1;
    }
    return room;
}
