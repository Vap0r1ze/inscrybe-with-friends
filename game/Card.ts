import { Sigil } from './Sigil';

export type MoxType = 'orange' | 'blue' | 'green';

export type Power = 'ants' | 'card-counter' | 'turn-counter' | number;

export interface CardPrint {
    name: string;
    health: number;
    power: Power;

    bloodCost?: number;
    boneCost?: number;
    moxNeeds?: MoxType[];

    sigils?: Sigil[];
}

export class Card {
    health = this.print.health;
    power = this.print.power;

    cost = {
        blood: this.print.bloodCost ?? 0,
        bone: this.print.boneCost ?? 0,
        mox: this.print.moxNeeds ?? [],
    };

    constructor(public print: CardPrint) {}
}
