import { CardSprites } from './cards';
import { PortraitSprites } from './portraits';
import { SigilSprites } from './sigils';
import { ActivatedSigilSprites } from './activatedSigils';
import { CostSprites } from './costs';
import { CharSprites } from './text';
import { BorderCharSprites } from './textBorder';
import { StatSprites } from './stats';

export interface Spritesheet {
    path: string;
    size: [number, number];
    tiled?: {
        tileSize: [number, number];
        borderWidth: { in: number, out: number };
    };
    sprites: Record<string, number[]>;
}

export const Spritesheets = {
    portraits: PortraitSprites,
    sigils: SigilSprites,
    buttonSigils: ActivatedSigilSprites,
    cards: CardSprites,
    costs: CostSprites,
    chars: CharSprites,
    borderChars: BorderCharSprites,
    stats: StatSprites,
};
