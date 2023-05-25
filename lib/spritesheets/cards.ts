import { Spritesheet } from '.';

export const CardSprites: Spritesheet = {
    path: '/assets/gbc/cards.png',
    size: [220, 232],
    tiled: {
        tileSize: [44, 58],
        borderWidth: { in: 0, out: 0 },
    },
    sprites: {
        common: [1, 0],
        terrain: [2, 1],
        zombie: [3, 1],
        rare: [3, 0],
        rare_terrain: [0, 1],
        rare_zombie: [1, 1],
        deathcard: [2, 0],

        stitches: [0, 3],
        conduit_frame: [0, 0],
        nature_frame: [4, 0],
        tech_frame: [4, 1],
        undead_frame: [4, 2],
        wizard_frame: [4, 3],

        common_back: [2, 2],
        submerged_back: [2, 2],

        sac: [0, 2],
        slot: [2, 3],
    }
};
