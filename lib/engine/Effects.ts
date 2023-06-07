import { ActionReq, ActionRes } from './Actions';
import { Card, CardInfo, CardPos, CardPrint, CardState, FieldPos, Ruleset, getCardPower, initCardFromPrint } from './Card';
import { Event } from './Events';
import { FIGHT_SIDES, Fight, FightSide } from './Fight';
import { FightTick } from './Tick';
import { Sigil, SigilParamMap, SigilPos, sigils } from '../defs/sigils';
import { positions } from './utils';
import { ErrorType, FightError } from './Errors';
import { rulesets } from '../defs/prints';
import { clone, entries, fromEntries } from '../utils';
import { array as toposort } from 'toposort';

export type EffectTargets = Partial<Record<Exclude<EffectTarget, 'global'>, CardPos>>;
export type EffectTarget = 'played' | 'drawn' | 'attackee' | 'opposing' | 'global';
export type EffectTriggers<S extends Sigil = never> = {
    requests?: {
        [T in Event['type']]?: {
            callFor(this: NoopCardContext, event: Event<T>): [FightSide, ActionReq] | null;
            onResponse(this: EffectContext, event: Event<T>, res: ActionRes, req: ActionReq): Promise<void>;
        };
    };
    preSettleWrite?: {
        [T in Event['type']]?: (this: CardContext, event: Event<T>, params: SigilParamMap[S]) => void;
    };
    preSettleRead?: {
        [T in Event['type']]?: (this: ReaderCardContext, event: Readonly<Event<T>>, params: SigilParamMap[S]) => void;
    };
    postSettle?: {
        // TODO: type as Readonly<SettledEvent<T>>
        [T in Event['type']]?: (this: ReaderCardContext, event: Readonly<Event<T>>, params: SigilParamMap[S]) => void;
    };
};
export type ActiveSigils = Record<keyof EffectTriggers, SigilPos[]>;

export type ReaderCardContext = Omit<CardContext, 'cancel' | 'cancelDefault'>;
export type NoopCardContext = Omit<ReaderCardContext, 'createEvent'>;
export type CardContext = EffectContext & {
    pos: CardPos;
    readonly fieldPos?: FieldPos;
    readonly handPos?: [FightSide, number];
    readonly cardPrint: Readonly<CardPrint>;
    readonly card: Readonly<Card>;
    readonly side: FightSide;
    readonly isPlayed: boolean;
};
export type EffectContext = {
    tick: FightTick;
    targets: EffectTargets;

    createEvent<T extends Event['type']>(type: T, event: Omit<Event<T>, 'type'>): void;
    prependEvent<T extends Event['type']>(type: T, event: Omit<Event<T>, 'type'>): void;
    cancel(): void;
    cancelDefault(): void;
    tryMark(tag: string): boolean;

    prints: Ruleset['prints'];
    initCard(printId: string): Card;
    getCardState(pos: FieldPos): Readonly<CardState> | null;
    getCardInfo(pos: FieldPos): Readonly<CardInfo> | null;
    getCard(pos: FieldPos): Readonly<Card> | null;
    getPower(pos: FieldPos): number | null;
};
export type EffectSignals = { event: boolean, default: boolean, prepend: Event[] };

export function createEffectContext(tick: FightTick, event: Event, targets: EffectTargets, signals: EffectSignals, stack: Event[]): EffectContext {
    const effectCtx: EffectContext = {
        tick,
        targets,

        createEvent(type, data) {
            const event = { type, ...data } as unknown as Event;
            stack.push(clone(event));
        },
        prependEvent(type, data) {
            const event = { type, ...data } as unknown as Event;
            signals.prepend.push(clone(event));
        },
        cancel() {
            signals.event = true;
        },
        cancelDefault() {
            signals.default = true;
        },
        tryMark(tag) {
            // @ts-ignore
            if (event[Symbol.for(tag)]) return false;
            // @ts-ignore
            return event[Symbol.for(tag)] = true;
        },

        get prints() {
            return rulesets[this.tick.fight.opts.ruleset].prints;
        },
        initCard(printId: string) {
            return initCardFromPrint(this.prints, printId);
        },
        getCardState(pos) {
            return effectCtx.getCard(pos)?.state ?? null;
        },
        getCardInfo(pos) {
            const card = effectCtx.getCard(pos);
            if (card == null) return null;
            return { print: this.prints[card.print], state: card.state };
        },
        getCard(pos) {
            return tick.fight.field[pos[0]][pos[1]] ?? null;
        },
        getPower(pos) {
            return getCardPower(this.prints, this.tick.fight, pos);
        },
    };
    return effectCtx;
}
export function createCardContext(tick: FightTick, effectCtx: EffectContext, pos: CardPos): CardContext {
    return {
        ...effectCtx,
        pos,

        get fieldPos() {
            if (!this.pos) throw FightError.create(ErrorType.InvalidPositionAccess);
            const [area, pos] = this.pos;
            if (area === 'field') return pos;
        },
        get handPos() {
            if (!this.pos) throw FightError.create(ErrorType.InvalidPositionAccess);
            const [area, pos] = this.pos;
            if (area === 'hand') return pos;
        },
        get cardPrint() {
            return this.prints[this.card.print];
        },
        get card() {
            if (this.handPos != null) {
                const [side, idx] = this.handPos;
                return tick.fight.hands[side][idx];
            } else if (this.fieldPos != null) {
                return this.getCard(this.fieldPos)!;
            };
            throw FightError.create(ErrorType.InvalidPositionAccess);
        },
        get side() {
            return (this.fieldPos?.[0] ?? this.handPos?.[0])!;
        },
        get isPlayed() {
            if (!this.targets.played || !this.fieldPos) return false;
            return positions.isSame(this.targets.played, ['field', this.fieldPos]);
        },
    };
}

export function getTargets(fight: Fight<FightSide> | null, event: Event): EffectTargets {
    const targets: EffectTargets = {};
    switch (event.type) {
        case 'attack':
            targets.played = ['field', event.from];

            if (!event.direct) targets.attackee = ['field', event.to];
            break;
        case 'perish':
        case 'activate':
        case 'play':
        case 'triggerAttack':
        case 'heal':
            targets.played = ['field', event.pos];
            break;
        case 'draw':
            if (!fight) break;
            targets.drawn = ['hand', [event.side, fight.hands[event.side].length - 1]];
            break;
        case 'move':
            targets.played = ['field', event.from];
            targets.opposing = ['field', positions.opposing(event.to)];
            break;
    }
    if (targets.played && !targets.opposing) targets.opposing = ['field', positions.opposing(targets.played[1])];
    return targets;
}

function getActiveSigilsFromCard<T extends keyof ActiveSigils>(
    card: Card,
    pos: CardPos,
    event: Event,
    targets: EffectTargets,
    activeEffects: Pick<ActiveSigils, T>,
) {
    for (const sigil of card.state.sigils) {
        const sigilDef = sigils[sigil];
        if (sigilDef.runAt && sigilDef.runAt !== pos[0]) continue;
        const sigilPos: SigilPos = [pos, sigil];
        let runAs = sigilDef.runAs;
        if (sigilDef.runAt === 'field' && !runAs) runAs = 'global';
        if (!runAs) continue;
        if (runAs !== 'global') {
            const target = targets[runAs];
            if (target == null || !positions.isSame(target, sigilPos[0])) continue;
        }

        for (const [effectType, effects] of entries(activeEffects))
            if (sigilDef[effectType]?.[event.type]) effects.push(sigilPos);
    }
}

export function getActiveSigils<T extends keyof ActiveSigils>(
    tick: FightTick,
    event: Event,
    targets: EffectTargets,
    effectTypes: T[],
) {
    const activeSigils: Pick<ActiveSigils, T> = fromEntries(effectTypes.map((type) => [type, []]));
    for (const side of FIGHT_SIDES) {
        for (let lane = 0; lane < tick.fight.opts.lanes; lane++) {
            const card = tick.fight.field[side][lane];
            if (card == null) continue;
            getActiveSigilsFromCard(card, ['field', [side, lane]], event, targets, activeSigils);
        }
        for (let handIdx = 0; handIdx < tick.fight.hands[side].length; handIdx++) {
            const card = tick.fight.hands[side][handIdx];
            getActiveSigilsFromCard(card, ['hand', [side, handIdx]], event, targets, activeSigils);
        }
    }
    for (const [type, effects] of entries(activeSigils)) {
        const edges: [SigilPos, SigilPos][] = [];
        for (const pos1 of effects) {
            for (const pos2 of effects.filter(pos => sigils[pos[1]].runAfter?.includes(pos1[1]))) {
                edges.push([pos1, pos2]);
            }
        }
        activeSigils[type] = toposort(effects, edges);
    }
    return activeSigils;
}

export const defaultEffects: {
    preSettle: {
        [T in Event['type']]?: (this: FightTick, event: Readonly<Event<T>>) => void;
    },
    postSettle: {
        [T in Event['type']]?: (this: FightTick, event: Readonly<Event<T>>) => void;
    },
} = {
    preSettle: {
        triggerAttack(event) {
            this.queue.unshift({ type: 'attack', from: event.pos, to: positions.opposing(event.pos) });
        },
        perish(event) {
            // TODO: maybe add a bones field to the event?
            let collectedBones = 1;
            const [side, lane] = event.pos;
            const card = this.fight.field[side][lane]!;
            if (card.state.sigils.includes('boneless')) collectedBones = 0;
            this.queue.unshift({ type: 'bones', amount: collectedBones, side });
        },
    },
    postSettle: {
        phase(event) {
            if (event.phase === 'pre-turn') {
                const { side } = this.fight.turn;
                const [energy, totalEnergy] = this.fight.players[side].energy;
                this.queue.unshift({
                    type: 'energy',
                    side,
                    amount: totalEnergy - energy + 1,
                }, { type: 'phase', phase: 'draw' });
            } else if (event.phase === 'draw') {
            } else if (event.phase === 'play') {
            } else if (event.phase === 'pre-attack') {
                this.queue.push({ type: 'phase', phase: 'attack' });
            } else if (event.phase === 'attack') {
                const { side } = this.fight.turn;
                this.queue.unshift(
                    ...Array.from({ length: this.fight.opts.lanes }, (_, lane) => ({
                        type: 'triggerAttack',
                        pos: [side, lane] as FieldPos,
                    } as const)),
                );
                this.queue.push({ type: 'phase', phase: 'post-attack' });
            } else if (event.phase === 'post-attack') {
                const sideIdx = FIGHT_SIDES.indexOf(this.fight.turn.side);
                const side = FIGHT_SIDES[(sideIdx + 1) % FIGHT_SIDES.length];
                this.queue.push({ type: 'phase', phase: 'pre-turn', side });
            }
        },
    },
};
