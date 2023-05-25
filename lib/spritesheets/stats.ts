import { Spritesheet } from '.';

export const StatSprites: Spritesheet = {
    path: '/assets/gbc/stats.png',
    size: [50, 44],
    tiled: {
        tileSize: [16, 8],
        borderWidth: { in: 1, out: 0 },
    },
    sprites: {
        greenMox: [0, 0],
        ants: [0, 1],
        bells: [0, 2],
        mirror: [0, 3],
        cards: [0, 4],
    }
};
