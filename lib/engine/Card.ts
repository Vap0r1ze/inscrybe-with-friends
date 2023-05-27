import { Fight, FightSide } from './Fight';
import { prints } from '../defs/prints';
import { positions } from './utils';
import { Sigil } from '../defs/sigils';

// Bitfields
export enum MoxType {
    Green = 1 << 0,
    Orange = 1 << 1,
    Blue = 1 << 2,
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

export type Tribe = 'ant' | 'insect' | 'canine' | 'avian' | 'hooved' | 'reptile' | 'rodent' | 'mox';
export interface CardPrint {
    name: string;
    desc?: string;
    portrait?: string;
    face?: 'rare' | 'terrain';
    frame?: 'nature_frame' | 'tech_frame' | 'undead_frame' | 'wizard_frame';
    fused?: boolean;

    health: number;
    power: Stat;
    cost?: Cost;
    noSac?: boolean;
    tribes?: Tribe[];

    sigils?: Sigil[];

    evolution?: string;
}
export interface CardState {
    power: Stat;
    health: number;
    sigils: Sigil[];
    flipped?: boolean;
    forward?: boolean;
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

export function initCardFromPrint(printId: string): Card {
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

export function getCardPower<Side extends FightSide = FightSide>(fight: Fight<Side>, pos: FieldPos): number | null {
    const [side, lane] = pos as [Side, number];
    const card = fight.field[side][lane];
    if (card == null) return null;
    if (card.state.power === 'ants') {
        return fight.field[side].filter(card => card ? prints[card.print].tribes?.includes('ant') : false).length;
    } else if (card.state.power === 'hand') {
        return fight.hands[side].length;
    } else if (card.state.power === 'bells') {
        // TODO
        return lane + 1;
    } else if (card.state.power === 'mirror') {
        const opposingPos = positions.opposing(pos);
        const opposing = fight.field[opposingPos[0]][opposingPos[1]];
        if (opposing == null) return 0;
        // NOTE: https://youtu.be/lbeG5LjqCT4?t=521
        return getCardPower(fight, opposingPos);
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
