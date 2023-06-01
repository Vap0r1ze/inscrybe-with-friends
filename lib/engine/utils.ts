import { CardPos, FieldPos } from './Card';
import { FightSide } from './Fight';

export const positions = {
    isOpposing: (a: FieldPos, b: FieldPos) => a[0] !== b[0] && a[1] === b[1],
    isSameField: (a: FieldPos, b: FieldPos) => a[0] === b[0] && a[1] === b[1],
    isSame: (a: CardPos, b: CardPos) => a[0] === b[0] && a[1][0] === b[1][0] && a[1][1] === b[1][1],
    isAdjacent: (a: FieldPos, b: FieldPos) => a[0] === b[0] && Math.abs(a[1] - b[1]) === 1,
    opposing: (pos: FieldPos, lane?: number): FieldPos => [oppositeSide(pos[0]), lane ?? pos[1]],
};

export const lists ={
    subtract: <T>(lhs: T[], rhs: T[]) => {
        const res: T[] = [];
        const originalClone = [...rhs];
        for (const item of lhs) {
            const index = originalClone.indexOf(item);
            if (index === -1) res.push(item);
            else originalClone.splice(index, 1);
        }
        return res;
    },
    intersect: <T>(original: T[], current: T[]) => {
        const res: T[] = [];
        const originalClone = [...original];
        for (const item of current) {
            const index = originalClone.indexOf(item);
            if (index === -1) continue;
            res.push(item);
            originalClone.splice(index, 1);
        }
        return res;
    },
};

export const oppositeSide = (side: FightSide): FightSide => side === 'player' ? 'opposing' : 'player';
