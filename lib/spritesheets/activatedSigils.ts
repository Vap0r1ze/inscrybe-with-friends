import { Spritesheet } from '.';

export const ActivatedSigilSprites: Spritesheet = {
    path: '/assets/gbc/sigils.png',
    size: [127, 167],
    tiled: {
        tileSize: [22, 10],
        borderWidth: { out: 1, in: 1 },
    },
    sprites: {
        activatedDealDamage: [1, 127],
        activatedDiceRollBone: [24, 127],
        activatedDiceRollEnergy: [47, 127],
        activatedDrawSkeleton: [70, 127],
        activatedEnergyToBones: [93, 127],
        activatedHeal: [1, 138],
        activatedSacrificeDraw: [24, 138],
        activatedStatsUp: [47, 138],
        activatedStatsUpEnergy: [70, 138],
    },
};
