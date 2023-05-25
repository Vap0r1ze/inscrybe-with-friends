import { Spritesheet } from '.';

export const CostSprites: Spritesheet = {
    path: '/assets/gbc/costs.png',
    size: [109, 161],
    tiled: {
        tileSize: [26, 15],
        borderWidth: { in: 1, out: 1 },
    },
    sprites: {
        bones1: [0, 0],
        bones2: [0, 1],
        bones3: [0, 2],
        bones4: [0, 3],
        bones5: [0, 4],
        bones6: [0, 5],
        bones7: [0, 6],
        bones8: [0, 7],
        bones9: [0, 8],
        bones10: [0, 9],
        bones11: [1, 7],
        bones12: [1, 8],
        bones13: [1, 9],

        blood1: [1, 0],
        blood2: [1, 1],
        blood3: [1, 2],
        blood4: [1, 3],

        mox1: [2, 0],
        mox2: [2, 1],
        mox3: [2, 2],
        mox4: [2, 3],
        mox5: [2, 4],
        mox6: [2, 5],
        mox7: [2, 6],

        battery1: [3, 0],
        battery2: [3, 1],
        battery3: [3, 2],
        battery4: [3, 3],
        battery5: [3, 4],
        battery6: [3, 5],
    }
};
