import { matrix } from '@/utils/math';
import { Card } from './Card';

enum MatchFeatures {
    Anticipated = 'anticipated',
    EarlyPlay = 'early-play',
    Rotary = 'rotary',
}

interface MatchOptions {
    lanes: number;
    rows: { player: number, opposing: number };
    features: MatchFeatures[];
}

const getDefaultOptions = (): MatchOptions => ({
    lanes: 4,
    rows: { player: 1, opposing: 2 },
    features: [MatchFeatures.Anticipated],
});

export class Match {
    field = {
        playerRows: matrix(this.opts.rows.player, this.opts.lanes, null),
        opposingRows: matrix(this.opts.rows.opposing, this.opts.lanes, null),
    };

    constructor(public opts = getDefaultOptions()) {}
}

export type Slot = Card | null;
export type Side = 'player' | 'opposing';
