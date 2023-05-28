import { Spritesheet } from '.';

export const StatSprites: Spritesheet = {
    path: '/assets/gbc/stats.png',
    size: [54, 15],
    tiled: {
        tileSize: [8, 13],
        borderWidth: { in: 3, out: 1 },
    },
    sprites: {
        hand: [0, 0],
        mirror: [1, 0],
        bells: [2, 0],
        ants: [3, 0],
        moxes: [4, 0],
    },
};
