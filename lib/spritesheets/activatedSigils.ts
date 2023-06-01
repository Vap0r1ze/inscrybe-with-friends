import { Spritesheet } from '.';

export const ActivatedSigilSprites: Spritesheet = {
    path: '/assets/gbc/activated_sigils.png',
    size: [116, 23],
    tiled: {
        tileSize: [22, 10],
        borderWidth: { out: 1, in: 1 },
    },
    sprites: {
        activatedDealDamage: [0, 0],
        activatedDiceRollBone: [1, 0],
        activatedDiceRollEnergy: [2, 0],
        activatedDrawSkeleton: [3, 0],
        activatedEnergyToBones: [4, 0],
        activatedHeal: [0, 1],
        activatedSacrificeDraw: [1, 1],
        activatedStatsUp: [2, 1],
        activatedStatsUpEnergy: [3, 1],
    },
};
