import { Sigil } from './Sigil';

// Bitfields
export enum MoxType {
    Green = 1 << 0,
    Orange = 1 << 1,
    Blue = 1 << 2,
};
export enum SpecialStat {
    AntCounter = 'ants',
    CardCounter = 'cards',
    TurnCounter = 'turns',
    MoxCounter = 'moxes',
    Mirror = 'mirror',
}

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

export interface Card {
    name: string;
    health: Stat;
    power: Stat;
    cost?: Cost;

    portrait?: string;
    face?: 'rare';
    frame?: 'nature' | 'tech' | 'undead' | 'wizard';
    back?: 'submerged';

    sigils?: Sigil[];
}
