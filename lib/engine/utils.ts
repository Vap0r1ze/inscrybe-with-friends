import { CardPos, FieldPos } from './Card';

export const positions = {
    isOpposing: (a: FieldPos, b: FieldPos) => a[0] !== b[0] && a[1] === b[1],
    isSameField: (a: FieldPos, b: FieldPos) => a[0] === b[0] && a[1] === b[1],
    isSame: (a: CardPos, b: CardPos) => a[0] === b[0] && a[1][0] === b[1][0] && a[1][1] === b[1][1],
    isAdjacent: (a: FieldPos, b: FieldPos) => a[0] === b[0] && Math.abs(a[1] - b[1]) === 1,
    opposing: (pos: FieldPos, lane?: number): FieldPos => [pos[0] === 'player' ? 'opposing' : 'player', lane ?? pos[1]]
};
