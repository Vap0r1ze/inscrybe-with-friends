import { Spritesheet } from '.';

export const BorderCharSprites: Spritesheet = {
    path: '/assets/gbc/text_border.png',
    size: [93, 8],
    tiled: {
        borderWidth: { out: 0, in: 1 },
        tileSize: [7, 8],
    },
    sprites: {
        0: [0, 0],
        1: [1, 0],
        2: [2, 0],
        3: [3, 0],
        4: [4, 0],
        5: [5, 0],
        6: [6, 0],
        7: [7, 0],
        8: [8, 0],
        9: [9, 0],
        x: [80, 0, 8, 8],
        '-': [89, 0, 4, 8],
    },
};
