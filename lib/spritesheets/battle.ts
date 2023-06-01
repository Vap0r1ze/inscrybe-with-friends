import { Spritesheet } from '.';

export const BattleSprites: Spritesheet = {
    path: '/assets/gbc/fight/nature.png',
    size: [128, 252],
    sprites: {
        slot: [0, 0, 44, 58],
        slotHover: [45, 0, 44, 58],
        earlySlot: [0, 59, 44, 32],
        earlySlotHover: [0, 59, 44, 32],

        bones: [90, 60, 11, 16],
        energy: [90, 0, 12, 15],
        energyUsed: [103, 0, 12, 15],
        energyEmpty: [116, 0, 12, 15],
        blood: [90, 44, 11, 15],
        bloodEmpty: [102, 44, 11, 15],
        moxBEmpty: [90, 16, 12, 13],
        moxB: [90, 30, 12, 13],
        moxGEmpty: [103, 16, 12, 13],
        moxG: [103, 30, 12, 13],
        moxOEmpty: [116, 16, 12, 13],
        moxO: [116, 30, 12, 13],

        scaleBase: [0, 103, 24, 62],
        scaleBowl: [102, 60, 26, 40],
        scalePoint: [117, 44, 11, 11],
        scale: [0, 92, 95, 10],

        bellDisabled: [25, 214, 91, 36],
        bell: [25, 177, 91, 36],
        bellHover: [25, 140, 91, 36],
        bellActive: [25, 103, 91, 36],
    },
};
