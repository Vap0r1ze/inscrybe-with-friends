import { ActionReq, ActionRes } from './Actions';
import { Card, CardInfo, CardPos, CardPrint, CardState, FieldPos, getCardPower } from './Card';
import { Event } from './Events';
import { FIGHT_SIDES, Fight, FightSide } from './Fight';
import { FightContext } from './Context';
import { SigilPos, sigils } from '../defs/sigils';
import { positions } from './utils';
import { ErrorType, createError } from './Errors';
import { prints } from '../defs/prints';
import { entries, fromEntries } from '../utils';

export type EffectTargets = Partial<Record<Exclude<EffectTarget, 'global'>, CardPos>>;
export type EffectTarget = 'played' | 'drawn' | 'attackee' | 'opposing' | 'global';
export type EffectTriggers = {
    requests?: {
        [T in Event['type']]?: {
            callFor(this: NoopSigilContext, event: Event<T>): [FightSide, ActionReq] | null;
            onResponse(this: EffectContext, event: Event<T>, res: ActionRes, req: ActionReq): Promise<void>;
        };
    };
    writers?: {
        [T in Event['type']]?: (this: SigilContext, event: Event<T>) => void;
    };
    readers?: {
        [T in Event['type']]?: (this: ReaderSigilContext, event: Readonly<Event<T>>) => void;
    };
    cleanup?: {
        // TODO: type as Readonly<SettledEvent<T>>
        [T in Event['type']]?: (this: ReaderSigilContext, event: Readonly<Event<T>>) => void;
    };
};
export type ActiveSigils = Record<keyof EffectTriggers, SigilPos[]>;

export type ReaderSigilContext = Omit<SigilContext, 'cancel' | 'cancelDefault'>;
export type NoopSigilContext = Omit<ReaderSigilContext, 'createEvent'>;
export type SigilContext = EffectContext & {
    pos: CardPos;
    readonly fieldPos?: FieldPos;
    readonly handPos?: [FightSide, number];
    readonly cardPrint: Readonly<CardPrint>;
    readonly card: Readonly<Card>;
    readonly side: FightSide;
    readonly isPlayed: boolean;
};
export type EffectContext = {
    ctx: FightContext;
    targets: EffectTargets;

    createEvent<T extends Event['type']>(type: T, event: Omit<Event<T>, 'type'>): void;
    prependEvent<T extends Event['type']>(type: T, event: Omit<Event<T>, 'type'>): void;
    cancel(): void;
    cancelDefault(): void;

    getCardState(pos: FieldPos): Readonly<CardState> | null;
    getCardInfo(pos: FieldPos): Readonly<CardInfo> | null;
    getCard(pos: FieldPos): Readonly<Card> | null;
    getPower(pos: FieldPos): number | null;
};
export type EffectSignals = { event: boolean, default: boolean, prepend: Event[] };

export function createEffectContext(ctx: FightContext, event: Event, targets: EffectTargets, signals: EffectSignals, stack: Event[]): EffectContext {
    const effectCtx: EffectContext = {
        ctx,
        targets,

        createEvent(type, data) {
            const event: Event = JSON.parse(JSON.stringify({ type, ...data }));
            stack.push(event);
        },
        prependEvent(type, data) {
            const event: Event = JSON.parse(JSON.stringify({ type, ...data }));
            signals.prepend.push(event);
        },
        cancel() {
            signals.event = true;
        },
        cancelDefault() {
            signals.default = true;
        },

        getCardState(pos) {
            return effectCtx.getCard(pos)?.state ?? null;
        },
        getCardInfo(pos) {
            const card = effectCtx.getCard(pos);
            if (card == null) return null;
            return { print: prints[card.print], state: card.state };
        },
        getCard(pos) {
            return ctx.fight.field[pos[0]][pos[1]] ?? null;
        },
        getPower(pos) {
            let power = getCardPower(prints, this.ctx.fight, pos)!;
            // TODO move buffs to somewhere separate
            for (const side of FIGHT_SIDES) {
                for (let lane = 0; lane < ctx.fight.opts.lanes; lane++) {
                    const card = ctx.fight.field[side][lane];
                    if (card == null) continue;
                    for (const sigil of card.state.sigils) {
                        const sigilDef = sigils[sigil];
                        power += sigilDef.buffs?.call(this, [side, lane], pos)?.power ?? 0;
                    }
                }
            }
            return Math.max(0, power);
        },
    };
    return effectCtx;
}
export function createSigilContext(ctx: FightContext, effectCtx: EffectContext, pos: CardPos): SigilContext {
    return {
        ...effectCtx,
        pos,

        get fieldPos() {
            if (!this.pos) throw createError(ErrorType.InvalidPositionAccess);
            const [area, pos] = this.pos;
            if (area === 'field') return pos;
        },
        get handPos() {
            if (!this.pos) throw createError(ErrorType.InvalidPositionAccess);
            const [area, pos] = this.pos;
            if (area === 'hand') return pos;
        },
        get cardPrint() {
            return prints[this.card.print];
        },
        get card() {
            if (this.handPos != null) {
                const [side, idx] = this.handPos;
                return ctx.fight.hands[side][idx];
            } else if (this.fieldPos != null) {
                return this.getCard(this.fieldPos)!;
            };
            throw createError(ErrorType.InvalidPositionAccess);
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

export function getTargets(fight: Fight<FightSide>, event: Event): EffectTargets {
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
            targets.drawn = ['hand', [event.side, fight.hands[event.side].length - 1]];
            break;
        case 'move':
            targets.played = ['field', event.from];
            break;
    }
    if (targets.played) targets.opposing = ['field', positions.opposing(targets.played[1])];
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
        const targetType = sigilDef.runAs || 'played';
        if (targetType !== 'global') {
            const target = targets[targetType];
            if (target == null || positions.isSame(target, sigilPos[0])) continue;
        }

        for (const [effectType, effects] of entries(activeEffects))
            if (sigilDef[effectType]?.[event.type]) effects.push(sigilPos);
    }
}

export function getActiveSigils<T extends keyof ActiveSigils>(
    ctx: FightContext,
    event: Event,
    targets: EffectTargets,
    effectTypes: T[],
) {
    const activeSigils: Pick<ActiveSigils, T> = fromEntries(effectTypes.map((type) => [type, []]));
    for (const side of FIGHT_SIDES) {
        for (let lane = 0; lane < ctx.fight.opts.lanes; lane++) {
            const card = ctx.fight.field[side][lane];
            if (card == null) continue;
            getActiveSigilsFromCard(card, ['field', [side, lane]], event, targets, activeSigils);
        }
        for (let handIdx = 0; handIdx < ctx.fight.hands[side].length; handIdx++) {
            const card = ctx.fight.hands[side][handIdx];
            getActiveSigilsFromCard(card, ['hand', [side, handIdx]], event, targets, activeSigils);
        }
    }
    return activeSigils;
}

export const defaultEffects: {
    preSettle: {
        [T in Event['type']]?: (this: FightContext, event: Readonly<Event<T>>) => void;
    },
    postSettle: {
        [T in Event['type']]?: (this: FightContext, event: Readonly<Event<T>>) => void;
    },
} = {
    preSettle: {
        triggerAttack(event) {
            // FIXME
            // const power = getCardPower(this.fight, event.pos);
            // if (!power) return;
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
                this.queue.unshift({
                    type: 'energy',
                    side,
                    amount: this.fight.players[side].energy[1] + 1,
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
