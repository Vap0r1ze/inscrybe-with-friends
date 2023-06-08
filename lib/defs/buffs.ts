import { FieldPos, getCircuit } from '../engine/Card';
import { Fight } from '../engine/Fight';
import { positions } from '../engine/utils';
import { rulesets } from './prints';

export type BuffDef = {
    check(fight: Fight<'player'>, source: FieldPos, target: FieldPos): {
        power?: number;
    } | null;
};

export type Buff = keyof typeof BUFFS;
const BUFFS = {
    incrAdjPower: {
        check(fight, source, target) {
            return {
                power: positions.isAdjacent(source, target) ? 1 : 0,
            };
        },
    },
    decrOppPower: {
        check(fight, source, target) {
            const [targetSide, targetLane] = target;
            const targetCard = fight.field[targetSide][targetLane];
            if (!positions.isOpposing(source, target)) return null;
            if (targetCard?.state.sigils.includes('stone')) return null;
            return {
                power: -1,
            };
        },
    },
    incrMoxPower: {
        check(fight, source, target) {
            const { prints } = rulesets[fight.opts.ruleset];
            const [targetSide, targetLane] = target;
            const targetCard = fight.field[targetSide][targetLane];
            if (targetSide !== source[0]) return null;
            const targetPrint = targetCard ? prints[targetCard.print] : null;
            if (targetPrint?.tribes?.includes('mox')) return { power: 1 };
            return null;
        },
    },
    incrCircuitPower: {
        check(fight, source, target) {
            const [side, lane] = source;
            if (target[0] !== side) return null;
            const circuit = getCircuit(rulesets[fight.opts.ruleset].prints, fight.field[side]);
            if (!circuit[lane - 1] && !circuit[lane + 1]) return null;
            if (circuit[target[1]] !== 'circuit') return null;
            return { power: 1 };
        },
    },
} satisfies Record<string, BuffDef>;

export const buffs: Record<string, BuffDef> = BUFFS;
