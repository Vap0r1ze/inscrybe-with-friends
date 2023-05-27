import { Card, CardPos, FieldPos, getCardPower } from './Card';
import { DeckType, Fight, FightSide, Phase } from './Fight';

export type Event<T extends keyof EventMap = keyof EventMap> = T extends keyof EventMap ? (EventMap[T] & { type: T }) : never;

export type PerishCause = 'attack' | 'sac' | 'transient' | 'hammer' | 'death-touch';

type EventMap = {
    phase: { phase: Phase; side?: FightSide };
    energy: { side: FightSide, amount: number };
    energySpend: { side: FightSide, amount: number };
    bones: { side: FightSide; amount: number };
    draw: { side: FightSide; card?: Card; source?: DeckType };
    perish: { pos: FieldPos; cause: PerishCause };
    triggerAttack: { pos: FieldPos };
    attack: { from: FieldPos; to: FieldPos; direct?: boolean; damage?: number };
    shoot: { from: FieldPos; to: FieldPos; damage: number };
    play: { pos: FieldPos; card: Card; fromHand?: [FightSide, number]; transient?: boolean };
    transform: { pos: FieldPos; card: Card; };
    move: { from: FieldPos; to: FieldPos };
    heal: { pos: FieldPos; amount: number };
    activate: { pos: FieldPos };
    newSigil: { pos: CardPos; sigil: string };
    flip: { pos: FieldPos };
};

export const eventSettlers: {
    [T in Event['type']]: (fight: Fight<FightSide>, event: Event<T>) => void;
} = {
    phase(fight, event) {
        fight.turn.phase = event.phase;
        if (event.side) fight.turn.side = event.side;
    },
    energy(fight, event) {
        const { energy } = fight.players[event.side];
        energy[0] = Math.min(6, energy[0] + event.amount);
        energy[1] = Math.max(energy[1], energy[0]);
    },
    energySpend(fight, event) {
        fight.players[event.side].energy[0] -= event.amount;
    },
    bones(fight, event) {
        fight.players[event.side].bones += event.amount;
    },
    draw(fight, event) {
        fight.hands[event.side].push(event.card!);
    },
    perish(fight, event) {
        const [side, lane] = event.pos;
        fight.field[side][lane] = null;
    },
    triggerAttack(fight, event) {},
    attack(fight, event) {
        const power = getCardPower(fight, event.from)!;
        event.damage ??= power;
        toCard: if (event.direct) {
            const [toSide, toLane] = event.to;
            const target = fight.field[toSide][toLane];
            if (!target) break toCard;
            target.state.health -= event.damage;
        };
        fight.points[event.from[0]] += event.damage;
    },
    shoot(fight, event) {
        const [toSide, toLane] = event.to;
        const target = fight.field[toSide][toLane];
        if (!target) return;
        target.state.health -= event.damage;
    },
    play(fight, event) {
        const [side, lane] = event.pos;
        fight.field[side][lane] = event.card;

        if (event.fromHand) {
            const [side, idx] = event.fromHand;
            fight.hands[side].splice(idx, 1);
        }
    },
    transform(fight, event) {
        const [side, lane] = event.pos;
        fight.field[side][lane] = event.card;
    },
    move(fight, event) {
        const [fromSide, fromLane] = event.from;
        const [toSide, toLane] = event.to;
        if (fight.field[toSide][toLane] != null) return;
        fight.field[toSide][toLane] = fight.field[fromSide][fromLane];
        fight.field[fromSide][fromLane] = null;
    },
    heal(fight, event) {
        const [side, lane] = event.pos;
        const card = fight.field[side][lane]!;
        card.state.health += event.amount;
    },
    activate(fight, event) {},
    newSigil(fight, event) {
        const [side, lane] = event.pos;
        const card = fight.field[side][lane]!;
        card.state.sigils.push(event.sigil);
    },
    flip(fight, event) {
        const [side, lane] = event.pos;
        const card = fight.field[side][lane]!;
        card.state.flipped = true;
    },
};

export function isEventInvalid(fight: Fight<FightSide>, event: Event) {
    switch (event.type) {
        case 'attack': {
            const power = getCardPower(fight, event.from);
            if (!power) return true;
            const [side, lane] = event.from;
            if (!fight.field[side][lane]) return true;
            if (event.from[1] < 0 || event.from[1] >= fight.opts.lanes) return true;
            break;
        }
        case 'play': {
            const [side, lane] = event.pos;
            if (fight.field[side][lane] != null) return true;
            break;
        }
        case 'triggerAttack': {
            const [, lane] = event.pos;
            if (lane < 0 || lane >= fight.opts.lanes) return true;
            break;
        }
        case 'draw': {
            if (!event.card) {
                if (!event.source) return true;
                if (fight.decks[event.side][event.source].length === 0) return true;
            };
            break;
        }
        case 'energySpend': {
            if (fight.players[event.side].energy[0] < event.amount) return true;
            break;
        }
        case 'move': {
            const [fromSide, fromLane] = event.from;
            // const [toSide, toLane] = event.to;
            // if (fight.field[toSide][toLane] != null) return true;2
            if (fight.field[fromSide][fromLane] == null) return true;
            break;
        }
        case 'heal':
        case 'flip':
        case 'newSigil':
        case 'transform':
        case 'perish': {
            const [side, lane] = event.pos;
            const card = fight.field[side][lane];
            if (!card) return true;
            break;
        }
    }
    return false;
}
