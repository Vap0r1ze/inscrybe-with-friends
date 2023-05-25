import { CardPrint } from './Card';

export const prints: Record<string, CardPrint> = {
    squirrel: {
        name: 'Squirrel',
        portrait: 'squirrel',
        power: 0,
        health: 1,
    },
    rabbit: {
        name: 'Rabbit',
        portrait: 'rabbit',
        power: 0,
        health: 1,
    },
    wolf: {
        name: 'Wolf',
        portrait: 'wolf',
        power: 3,
        health: 2,
        cost: { type: 'blood', amount: 2 },
    },
    wolfCub: {
        name: 'Wolf Cub',
        portrait: 'wolfCub',
        power: 1,
        health: 2,
        cost: { type: 'blood', amount: 1 },

        evolution: 'wolf',
    },
    stoat: {
        name: 'Stoat',
        portrait: 'stoat',
        power: 1,
        health: 3,
        cost: { type: 'blood', amount: 1 },
    },
    bullfrog: {
        name: 'Bullfrog',
        portrait: 'bullfrog',
        power: 1,
        health: 2,
        cost: { type: 'blood', amount: 1 },
        sigils: ['mightyLeap'],
    },
    oppossum: {
        name: 'Oppossum',
        portrait: 'oppossum',
        power: 1,
        health: 1,
        cost: { type: 'bone', amount: 2 },
    },
    ringWorm: {
        name: 'Ring Worm',
        portrait: 'ringWorm',
        power: 0,
        health: 1,
        cost: { type: 'blood', amount: 1 },
    },
    magpie: {
        name: 'Magpie',
        portrait: 'magpie',
        power: 1,
        health: 1,
        cost: { type: 'blood', amount: 2 },
        sigils: ['airborne', 'hoarder'],
    },
    packRat: {
        name: 'Pack Rat',
        portrait: 'packRat',
        face: 'rare',
        power: 2,
        health: 2,
        cost: { type: 'blood', amount: 2 },
    },
};
