import { Action, ActionRes, isActionInvalid } from './Actions';
import { Card, CardPos, getMoxes } from './Card';
import { Event, eventSettlers, isEventInvalid } from './Events';
import { DeckType, FIGHT_SIDES, Fight, FightSide } from './Fight';
import { prints } from '../defs/prints';
import { sigils } from '../defs/sigils';
import { getActiveSigils, createEffectContext, createSigilContext, defaultEffects, getTargets, EffectSignals } from './Effects';
import { ErrorType, createError } from './Errors';

export interface FightContext<M = unknown> {
    fight: Fight<FightSide>;
    settled: Event[];
    queue: Event[];
    adapter: FightAdapter<M>;
    meta: M;
}

export type FightPacket = {
    settled: Event[];
    waitingFor: Fight['waitingFor'];
};

export interface FightAdapter<M> {
    initDeck(this: FightContext<M>, side: FightSide, deck: DeckType): Promise<number[]>;
    getCardsFromDeck(this: FightContext<M>, side: FightSide, deck: DeckType, idxs: number[]): Promise<Card[]>;
}

export function createContext<M>(fight: Fight<FightSide>, adapter: FightAdapter<M>, meta: M): FightContext<M> {
    return {
        fight,
        settled: [],
        queue: [],
        adapter,
        meta,
    };
}

function getPacket(ctx: FightContext): FightPacket {
    return {
        settled: ctx.settled.splice(0, ctx.settled.length),
        waitingFor: ctx.fight.waitingFor,
    };
}

export async function startGame(ctx: FightContext): Promise<FightPacket> {
    for (const side of FIGHT_SIDES) {
        const handSize = ctx.fight.opts.startingHand;
        ctx.fight.decks[side].main = await ctx.adapter.initDeck.call(ctx, side, 'main');
        ctx.fight.decks[side].side = await ctx.adapter.initDeck.call(ctx, side, 'side');
        ctx.queue.push(
            { type: 'draw', side, source: 'side' },
            ...Array.from({ length: handSize }, () => ({ type: 'draw', side, source: 'main' } as const)),
        );
    }

    ctx.queue.push({ type: 'phase', phase: 'pre-turn', side: 'player' });
    ctx.queue.push({ type: 'phase', phase: 'play' });

    await settleEvents(ctx);
    return getPacket(ctx);
}

export async function handleResponse(ctx: FightContext, side: FightSide, res: ActionRes): Promise<FightPacket> {
    if (!ctx.fight.waitingFor) throw createError(ErrorType.InvalidAction, 'Fight is not waiting for a response');
    if (ctx.fight.waitingFor.side !== side) throw createError(ErrorType.InvalidAction, 'Fight is not waiting for a response from you');

    const { event, req, sigil } = ctx.fight.waitingFor;
    const targets = getTargets(ctx.fight, event);
    const stack: Event[] = [];

    const effectCtx = createEffectContext(ctx, event, targets, { default: false, event: false, prepend: [] }, stack);
    sigils[sigil].requests![event.type]!.onResponse.call(effectCtx, event as never, res, req);

    ctx.fight.waitingFor = null;
    ctx.queue.unshift(...stack);
    await settleEvents(ctx);

    return getPacket(ctx);
}

export async function handleAction(ctx: FightContext, side: FightSide, action: Action): Promise<FightPacket> {
    if (ctx.fight.turn.side !== side) throw createError(ErrorType.InvalidAction, 'You cannot do an action during the opponent\'s turn');
    if (isActionInvalid(ctx, action)) throw createError(ErrorType.InvalidAction);

    const stack: Event[] = [];

    switch (action.type) {
        case 'draw': {
            const topIdx = ctx.fight.decks[side][action.deck].pop();
            if (topIdx == null) throw createError(ErrorType.InvalidAction, 'You cannot draw from an empty deck');
            const [card] = await ctx.adapter.getCardsFromDeck.call(ctx, side, action.deck, [topIdx]);
            stack.push({ type: 'draw', side, card, source: action.deck });
            break;
        }
        case 'play': {
            const card = ctx.fight.hands[side][action.card];
            if (card == null) throw createError(ErrorType.InvalidAction, 'You cannot play a card that is not in your hand');
            const print = prints[card.print];
            if (print.cost?.type === 'blood') {
                const sacError = createError(ErrorType.InsufficientResources, `Requires ${print.cost.amount} sacrifices`);
                if (action.sacs == null) throw sacError;
                const sacs = action.sacs.map(sac => ctx.fight.field[side][sac]);
                if (sacs.some(sac => sac == null))
                    throw createError(ErrorType.InsufficientResources, 'Cannot sacrifice a card that is not on the field');
                if (sacs.some(sac => prints[sac!.print].noSac))
                    throw createError(ErrorType.InsufficientResources, 'This card cannot be sacrificed');
                const sacsAmount = sacs.map(sac => {
                    let amount = 1;
                    if (sac?.state.sigils?.includes('threeSacs')) amount = 3;
                    return amount;
                }).reduce((a, b) => a + b, 0);
                // NOTE: this allows extraneous sacrifices, but that's fine i think?
                if (sacsAmount < print.cost.amount) throw sacError;
            } else if (print.cost?.type === 'bone') {
                if (ctx.fight.players[side].bones < print.cost.amount)
                    throw createError(ErrorType.InsufficientResources, `Requires ${print.cost.amount} bones`);
                stack.push({ type: 'bones', side, amount: -print.cost.amount });
            } else if (print.cost?.type === 'energy') {
                if (ctx.fight.players[side].energy[0] < print.cost.amount)
                    throw createError(ErrorType.InsufficientResources, `Requires ${print.cost.amount} energy`);
                stack.push({ type: 'energySpend', side, amount: print.cost.amount });
            } else if (print.cost?.type === 'mox') {
                // TODO: better error message
                if ((getMoxes(ctx.fight.field[side]) & print.cost.needs) === print.cost.needs)
                    throw createError(ErrorType.InsufficientResources, `Requires ${print.cost.needs} mox`);
            }
            stack.push({ type: 'play', card, pos: [side, action.lane], fromHand: [side, action.card] });
            break;
        }
        case 'hammer': {
            const card = ctx.fight.field[side][action.lane];
            if (card == null) throw createError(ErrorType.InvalidAction, 'You cannot hammer a lane that is empty');
            stack.push({ type: 'perish', pos: [side, action.lane], cause: 'hammer' });
            break;
        }
        case 'bellRing': {
            stack.push({ type: 'phase', phase: 'pre-attack' });
            break;
        }
        case 'activate': {
            const card = ctx.fight.field[side][action.lane];
            if (card == null) throw createError(ErrorType.InvalidAction, 'You cannot activate a lane that is empty');
            if (card.state.sigils.some(sigil => !sigils[sigil].readers?.activate))
                throw createError(ErrorType.InvalidAction, 'This lane has no activate sigil');
            stack.push({ type: 'activate', pos: [side, action.lane] });
            break;
        }
    }

    ctx.queue.unshift(...stack);
    await settleEvents(ctx);
    return getPacket(ctx);
}

async function fillEvent(ctx: FightContext, event: Event) {
    if (event.type === 'draw' && !event.card) {
        const idx = ctx.fight.decks[event.side][event.source!].at(-1)!;
        const [card] = await ctx.adapter.getCardsFromDeck.call(ctx, event.side, event.source!, [idx]);
        event.card = card;
    }
}

const MAX_STACK_SIZE = 1000;

async function settleEvents(ctx: FightContext) {
    const backlog = ctx.fight.backlog?.splice(0, ctx.fight.backlog.length);
    if (backlog) ctx.queue.push(...backlog);

    for (let event = ctx.queue.shift(); event; event = ctx.queue.shift()) {
        if (ctx.settled.length + ctx.queue.length >= MAX_STACK_SIZE)
            throw createError(ErrorType.MaxStackSize);

        const stack: Event[] = [];
        if (isEventInvalid(ctx.fight, event)) continue;

        const targets = getTargets(ctx.fight, event);

        // TODO optimize??
        const preSettleSigils = getActiveSigils(ctx, event, targets, ['writers', 'readers']);

        const signals: EffectSignals = { event: false, default: false, prepend: [] };

        const effectCtx = createEffectContext(ctx, event, targets, signals, stack);
        const sigilCtx = createSigilContext(ctx, effectCtx, null as unknown as CardPos);

        const originalEvent = JSON.parse(JSON.stringify(event)) as Event;

        for (const sigilPos of preSettleSigils.writers) {
            sigilCtx.pos = sigilPos[0];
            sigils[sigilPos[1]].writers![event.type]!.call(sigilCtx, event as never);
        }
        if (signals.event) continue;
        if (isEventInvalid(ctx.fight, event)) throw createError(ErrorType.InvalidEvent);
        if (signals.prepend.length) {
            ctx.queue.unshift(...signals.prepend, originalEvent);
            continue;
        }

        if (!signals.default) defaultEffects.preSettle[event.type]?.call(ctx, event as never);

        for (const sigilPos of preSettleSigils.readers) {
            sigilCtx.pos = sigilPos[0];
            sigils[sigilPos[1]].readers![event.type]!.call(sigilCtx, event as never);
        }

        await fillEvent(ctx, event);

        // TODO: maybe group some events?

        eventSettlers[event.type](ctx.fight, event as never);
        ctx.settled.push(event);

        if (!signals.default) defaultEffects.postSettle[event.type]?.call(ctx, event as never);

        const postSettleSigils = getActiveSigils(ctx, event, targets, ['cleanup', 'requests']);

        for (const sigilPos of postSettleSigils.cleanup) {
            sigilCtx.pos = sigilPos[0];
            sigils[sigilPos[1]].cleanup![event.type]!.call(sigilCtx, event as never);
        }

        let waitingFor: Fight['waitingFor'] | null = null;
        for (const sigilPos of postSettleSigils.requests) {
            sigilCtx.pos = sigilPos[0];
            const request = sigils[sigilPos[1]].requests![event.type]!.callFor.call(sigilCtx, event as never);
            if (!request) continue;
            waitingFor = {
                side: request[0],
                req: request[1],
                sigil: sigilPos[1],
                event,
            };
        }

        ctx.queue.unshift(...stack);
        if (waitingFor) {
            ctx.fight.backlog = ctx.queue.splice(0, ctx.queue.length);
            ctx.fight.waitingFor = waitingFor;
            break;
        }
    }
}
