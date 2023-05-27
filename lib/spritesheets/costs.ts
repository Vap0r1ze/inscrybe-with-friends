import { Spritesheet } from '.';

export const CostSprites: Spritesheet = {
    path: '/assets/gbc/costs.png',
    size: [109, 161],
    tiled: {
        tileSize: [26, 15],
        borderWidth: { in: 1, out: 1 },
    },
    sprites: {
        bone1: [0, 0],
        bone2: [0, 1],
        bone3: [0, 2],
        bone4: [0, 3],
        bone5: [0, 4],
        bone6: [0, 5],
        bone7: [0, 6],
        bone8: [0, 7],
        bone9: [0, 8],
        bone10: [0, 9],
        bone11: [1, 7],
        bone12: [1, 8],
        bone13: [1, 9],

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

        energy1: [3, 0],
        energy2: [3, 1],
        energy3: [3, 2],
        energy4: [3, 3],
        energy5: [3, 4],
        energy6: [3, 5],
    },
};
