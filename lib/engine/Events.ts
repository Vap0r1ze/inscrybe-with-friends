import { pick } from 'lodash';
import { prints } from '../defs/prints';
import { Sigil } from '../defs/sigils';
import { ActionReq, ActionRes } from './Actions';
import { Card, CardPos, FieldPos, getCardPower } from './Card';
import { FightTick } from './Tick';
import { DeckType } from './Deck';
import { Fight, FightSide, Phase } from './Fight';
import { includes } from '../utils';
import { oppositeSide } from './utils';

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
    mustPlay: { side: FightSide; card: number };
    transform: { pos: FieldPos; card: Card; };
    move: { from: FieldPos; to: FieldPos; turnAround?: boolean };
    heal: { pos: FieldPos; amount: number };
    stats: { pos: FieldPos; power?: number; health?: number; };
    activate: { pos: FieldPos };
    newSigil: { pos: CardPos; sigil: Sigil };
    flip: { pos: FieldPos };
    request: { side: FightSide; req: ActionReq; };
    response: { side: FightSide; req: ActionReq; res: ActionRes; };
};

// NOTE: assume the `fight` object is always dirty, clone any objects inside it before making state from it
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
        fight.players[event.side].handSize++;
    },
    perish(fight, event) {
        const [side, lane] = event.pos;
        fight.field[side][lane] = null;
    },
    triggerAttack(fight, event) {},
    attack(fight, event) {
        const power = getCardPower(prints, fight, event.from)!;
        event.damage ??= power;
        const [toSide, toLane] = event.to;
        const target = fight.field[toSide][toLane];
        if (event.direct || !target) fight.points[event.from[0]] += event.damage;
        else target.state.health = Math.max(0, target.state.health - event.damage);
    },
    shoot(fight, event) {
        const [toSide, toLane] = event.to;
        const target = fight.field[toSide][toLane];
        if (!target || target.state.flipped) return;
        target.state.health = Math.max(0, target.state.health - event.damage);
    },
    play(fight, event) {
        const [side, lane] = event.pos;
        fight.field[side][lane] = event.card;

        if (event.fromHand) {
            const [side, idx] = event.fromHand;
            fight.hands[side].splice(idx, 1);
            fight.players[side].handSize--;
            if (fight.mustPlay[side] === idx) {
                fight.mustPlay[side] = null;
            } else if (fight.mustPlay[side] != null && fight.mustPlay[side]! > idx) {
                fight.mustPlay[side]!--;
            }
        }
    },
    mustPlay(fight, event) {
        fight.mustPlay[event.side] = event.card;
    },
    transform(fight, event) {
        const [side, lane] = event.pos;
        fight.field[side][lane] = event.card;
    },
    move(fight, event) {
        const [fromSide, fromLane] = event.from;
        const [toSide, toLane] = event.to;
        const card = fight.field[fromSide][fromLane]!;
        if (event.turnAround) card.state.backward = !card.state.backward;
        if (fight.field[toSide][toLane] != null) return;
        if (toLane < 0 || toLane >= fight.opts.lanes) return;
        fight.field[toSide][toLane] = fight.field[fromSide][fromLane];
        fight.field[fromSide][fromLane] = null;
    },
    heal(fight, event) {
        const [side, lane] = event.pos;
        const card = fight.field[side][lane]!;
        card.state.health += event.amount;
    },
    stats(fight, event) {
        const [side, lane] = event.pos;
        const card = fight.field[side][lane]!;
        if (event.power != null) card.state.power = event.power;
        if (event.health != null) card.state.health = event.health;
    },
    activate(fight, event) {},
    newSigil(fight, event) {
        const [area, [side, idx]] = event.pos;
        const card = area === 'field' ? fight.field[side][idx]! : fight.hands[side][idx];
        card.state.sigils.push(event.sigil);
    },
    flip(fight, event) {
        const [side, lane] = event.pos;
        const card = fight.field[side][lane]!;
        card.state.flipped = !card.state.flipped;
    },
    request(fight, event) {
        fight.waitingFor = pick(event, ['side', 'req']);
    },
    response(fight, event) {
        fight.waitingFor = null;
    },
};

export function isEventInvalid({ fight, host }: FightTick, event: Event) {
    switch (event.type) {
        case 'attack': {
            const power = getCardPower(prints, fight, event.from);
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
                if (host.decks[event.side][event.source].length === 0) return true;
            };
            break;
        }
        case 'energySpend': {
            if (fight.players[event.side].energy[0] < event.amount) return true;
            break;
        }
        case 'move': {
            const [fromSide, fromLane] = event.from;
            if (fight.field[fromSide][fromLane] == null) return true;
            break;
        }
        case 'newSigil': {
            const [area, [side, idx]] = event.pos;
            const card = area === 'field' ? fight.field[side][idx] : fight.hands[side][idx];
            if (!card) return true;
            break;
        };
        case 'heal':
        case 'flip':
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

export function isEventType<const T>(types: T[], event: Event): event is Extract<Event, { type: T }> {
    return types.includes(event.type as T);
}

export function translateEvent(event: Event, side: FightSide, forClient: false): Event;
export function translateEvent(event: Event, side: FightSide): Event | null;
export function translateEvent(event: Event, side: FightSide, forClient: boolean = true): Event | null {
    const shouldFlip = side === 'opposing';
    // confidential events
    if (forClient) {
        if (event.type === 'draw' && event.side !== side) {
            return null;
        } else if (event.type === 'newSigil' && event.pos[0] === 'hand' && event.pos[1][0] !== side) {
            return null;
        }
        if ((event.type === 'request' || event.type === 'response') && event.side !== side) {
            if (event.req.type === 'chooseDraw') {
                event.req.choices = [];
            }
        }
        if (event.type === 'response' && event.side !== side) {
            if (event.res.type === 'chooseDraw') {
                event.res.idx = -1;
            }
        }
    }

    // flip FightSides
    if (shouldFlip &&
        isEventType(['phase', 'energy', 'energySpend', 'bones', 'draw', 'request', 'response', 'mustPlay'], event)
    && event.side) {
        event.side = oppositeSide(event.side);
    } else if (shouldFlip && event.type === 'play') {
        if (event.fromHand) event.fromHand[0] = oppositeSide(event.fromHand[0]);
        event.pos[0] = oppositeSide(event.pos[0]);
    }
    // flip FieldPos
    if (shouldFlip && isEventType(['perish', 'triggerAttack', 'transform', 'heal', 'activate', 'flip'], event)) {
        event.pos[0] = oppositeSide(event.pos[0]);
    } else if (shouldFlip && isEventType(['attack', 'shoot', 'move'], event)) {
        event.from[0] = oppositeSide(event.from[0]);
        event.to[0] = oppositeSide(event.to[0]);
    }
    return event;
}
