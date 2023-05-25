import { CardSprites } from './cards';
import { PortraitSprites } from './portraits';
import { SigilSprites } from './sigils';
import { CostSprites } from './costs';
import { CharSprites } from './text';
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
    cards: CardSprites,
    costs: CostSprites,
    chars: CharSprites,
    stats: StatSprites,
};
