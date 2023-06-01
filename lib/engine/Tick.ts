import { Action, ActionRes, isActionInvalid } from './Actions';
import { CardPos, getBloods, getMoxes, initCardFromPrint } from './Card';
import { Event, eventSettlers, isEventInvalid } from './Events';
import { FIGHT_SIDES, Fight, FightSide } from './Fight';
import { prints } from '../defs/prints';
import { Sigil, sigils } from '../defs/sigils';
import { getActiveSigils, createEffectContext, createSigilContext, defaultEffects, getTargets, EffectSignals } from './Effects';
import { ErrorType, FightError } from './Errors';
import { clone } from '../utils';
import { FightAdapter, FightHost } from './Host';
import { pick } from 'lodash';
import { DECK_TYPES } from './Deck';

export interface FightTick {
    fight: Fight<FightSide>;
    host: FightHost;
    adapter: FightAdapter;
    settled: Event[];
    queue: Event[];
    logger?: TickLogger;
}

export interface TickLogger {
    log: (message: string) => void;
    error: (message: string) => void;
    warn: (message: string) => void;
    info: (message: string) => void;
    debug: (message: string) => void;
}

export type FightPacket = {
    settled: Event[];
};

export async function startGame(tick: FightTick): Promise<FightPacket> {
    tick.queue.push({ type: 'phase', phase: 'pre-turn', side: 'player' });

    for (const side of FIGHT_SIDES) {
        const handSize = tick.fight.opts.startingHand;
        for (const deckType of DECK_TYPES)
            tick.host.decks[side][deckType] = await tick.adapter.initDeck.call(tick, side, deckType);
        tick.queue.push(
            { type: 'draw', side, source: 'side' },
            ...Array.from({ length: handSize }, () => ({ type: 'draw', side, source: 'main' } as const)),
        );
    }
    tick.queue.push({ type: 'phase', phase: 'play' });

    await settleEvents(tick);
    return getPacket(tick);
}

export async function handleResponse(tick: FightTick, side: FightSide, res: ActionRes): Promise<FightPacket> {
    if (!tick.host.waitingFor) throw FightError.create(ErrorType.InvalidAction, 'Fight is not waiting for a response');
    if (tick.host.waitingFor.side !== side) throw FightError.create(ErrorType.InvalidAction, 'Fight is not waiting for a response from you');

    const { event, req, sigil } = tick.host.waitingFor;
    const targets = getTargets(tick.fight, event);
    const stack: Event[] = [{
        type: 'response',
        side,
        req,
        res,
    }];

    const effectCtx = createEffectContext(tick, event, targets, { default: false, event: false, prepend: [] }, stack);
    sigils[sigil].requests![event.type]!.onResponse.call(effectCtx, event as never, res, req);

    tick.host.waitingFor = null;
    tick.queue.unshift(...stack);
    await settleEvents(tick);

    return getPacket(tick);
}

export async function handleEvents(tick: FightTick, events: Event[]): Promise<FightPacket> {
    tick.queue.unshift(...events);
    await settleEvents(tick);
    return getPacket(tick);
}

export async function handleAction(tick: FightTick, side: FightSide, action: Action): Promise<FightPacket> {
    if (tick.fight.turn.side !== side) throw FightError.create(ErrorType.InvalidAction, 'You cannot do an action during the opponent\'s turn');
    if (isActionInvalid(tick, action)) throw FightError.create(ErrorType.InvalidAction);

    const stack: Event[] = [];

    switch (action.type) {
        case 'draw': {
            // const topIdx = tick.host.decks[side][action.deck].pop();
            // if (topIdx == null) throw FightError.create(ErrorType.InvalidAction, 'You cannot draw from an empty deck');
            // const printId = tick.fight.decks[side][action.deck][topIdx];
            // const card = initCardFromPrint(prints, printId);
            if (tick.host.decks[side][action.deck].length === 0) throw FightError.create(ErrorType.InvalidAction, 'You cannot draw from an empty deck');
            stack.push({ type: 'draw', side, source: action.deck });
            stack.push({ type: 'phase', phase: 'play' });
            break;
        }
        case 'play': {
            const card = tick.fight.hands[side][action.card];
            if (card == null) throw FightError.create(ErrorType.InvalidAction, 'You cannot play a card that is not in your hand');
            const print = prints[card.print];
            if (tick.fight.mustPlay[side] != null && tick.fight.mustPlay[side] !== action.card) {
                const mustPlay = prints[tick.fight.hands[side][tick.fight.mustPlay[side]!].print];
                throw FightError.create(ErrorType.InvalidAction, `You must play your ${mustPlay.name}`);
            } if (tick.fight.mustPlay[side] === action.card) {
                // Skips other checks
            } else if (print.cost?.type === 'blood') {
                const sacError = FightError.create(ErrorType.InsufficientResources, `Requires ${print.cost.amount} sacrifices`);
                if (action.sacs == null) throw sacError;

                const sacs = action.sacs.map(sac => tick.fight.field[side][sac]);
                if (sacs.some(sac => sac == null))
                    throw FightError.create(ErrorType.InsufficientResources, 'Cannot sacrifice a card that is not on the field');
                if (sacs.some(sac => prints[sac!.print].noSac))
                    throw FightError.create(ErrorType.InsufficientResources, 'This card cannot be sacrificed');

                const sacBloods = sacs.map(sac => getBloods(prints, [sac]));
                sacBloods.sort((a, b) => b - a);
                const isExcessive = sacBloods.slice(0, -1).reduce((a, b) => a + b, 0) >= print.cost.amount;
                if (isExcessive) throw FightError.create(ErrorType.InvalidAction, 'You cannot sacrifice more than the required amount');

                const sacsAmount = sacBloods.reduce((a, b) => a + b, 0);
                if (sacsAmount < print.cost.amount) throw sacError;

                for (const lane of action.sacs) stack.push({ type: 'perish', pos: [side, lane], cause: 'sac' });
                stack.push({ type: 'mustPlay', side, card: action.card });
                break;
            } else if (print.cost?.type === 'bone') {
                if (tick.fight.players[side].bones < print.cost.amount)
                    throw FightError.create(ErrorType.InsufficientResources, `Requires ${print.cost.amount} bone(s)`);

                stack.push({ type: 'bones', side, amount: -print.cost.amount });
            } else if (print.cost?.type === 'energy') {
                if (tick.fight.players[side].energy[0] < print.cost.amount)
                    throw FightError.create(ErrorType.InsufficientResources, `Requires ${print.cost.amount} energy`);

                stack.push({ type: 'energySpend', side, amount: print.cost.amount });
            } else if (print.cost?.type === 'mox') {
                const needs = print.cost.needs;
                // TODO: better error message
                if ((getMoxes(tick.fight.field[side]) & needs) !== needs) {
                    const needsDisplay = Object.entries(print.cost.needs)
                        .filter(([name, gem]) => needs | gem)
                        .map(([name, gem]) => name)
                        .join(' + ');
                    throw FightError.create(ErrorType.InsufficientResources, `Requires ${needsDisplay} gem(s)`);
                }
            }

            stack.push({ type: 'play', card, pos: [side, action.lane], fromHand: [side, action.card] });
            break;
        }
        case 'hammer': {
            const card = tick.fight.field[side][action.lane];
            if (card == null) throw FightError.create(ErrorType.InvalidAction, 'You cannot hammer a lane that is empty');
            stack.push({ type: 'perish', pos: [side, action.lane], cause: 'hammer' });
            break;
        }
        case 'bellRing': {
            stack.push({ type: 'phase', phase: 'pre-attack' });
            break;
        }
        case 'activate': {
            const card = tick.fight.field[side][action.lane];
            if (card == null) throw FightError.create(ErrorType.InvalidAction, 'You cannot activate a lane that is empty');
            if (!card.state.sigils.includes(action.sigil as Sigil))
                throw FightError.create(ErrorType.InvalidAction, 'This card does not have that sigil');
            stack.push({ type: 'activate', pos: [side, action.lane] });
            break;
        }
    }

    tick.queue.unshift(...stack);
    await settleEvents(tick);
    return getPacket(tick);
}

function getPacket(tick: FightTick): FightPacket {
    return {
        settled: tick.settled.splice(0, tick.settled.length),
    };
}

async function fillEvent(tick: FightTick, event: Event) {
    if (event.type === 'draw' && !event.card) {
        const idx = tick.host.decks[event.side][event.source!].pop()!;
        const printId = tick.fight.decks[event.side][event.source!][idx];
        const card = initCardFromPrint(prints, printId);
        event.card = card;
    } else if (event.type === 'attack') {
        const target = tick.fight.field[event.to[0]][event.to[1]];
        if (target?.state.flipped) event.direct = true;
    }
}

const MAX_STACK_SIZE = 100;

async function settleEvents(tick: FightTick) {
    const backlog = tick.host.backlog.splice(0, tick.host.backlog.length);
    if (backlog) tick.queue.push(...backlog);

    let iterations = 0;

    eventLoop: for (let event = tick.queue.shift(); event; event = tick.queue.shift()) {
        if (iterations++ >= MAX_STACK_SIZE)
            throw FightError.create(ErrorType.MaxStackSize);

        tick.logger?.debug(`[Processing] ${JSON.stringify(event)}`);
        if (isEventInvalid(tick, event)) {
            tick.logger?.debug('Event was invalid!');
            continue;
        };

        // FIXME: KILL EVENTS TIED TO DEAD CARDS **AFTER** PERISH SETTLE
        if (event.type !== 'perish') {
            for (const side of FIGHT_SIDES) {
                for (const [lane, card] of tick.fight.field[side].entries()) {
                    if (card?.state.health === 0) {
                        tick.queue.unshift({ type: 'perish', pos: [side, lane], cause: 'attack' }, event);
                        tick.logger?.debug(`Postponing for death at [${side}, ${lane}]`);
                        continue eventLoop;
                    }
                }
            }
        }

        const targets = getTargets(tick.fight, event);

        const preSettleSigils = getActiveSigils(tick, event, targets, ['writers', 'readers']);

        const signals: EffectSignals = { event: false, default: false, prepend: [] };

        const stack: Event[] = [];
        const effectCtx = createEffectContext(tick, event, targets, signals, stack);
        const sigilCtx = createSigilContext(tick, effectCtx, null as unknown as CardPos);

        const originalEvent = clone(event);

        for (const sigilPos of preSettleSigils.writers) {
            sigilCtx.pos = sigilPos[0];
            sigils[sigilPos[1]].writers![event.type]!.call(sigilCtx, event as never);
        }
        if (signals.event) {
            tick.logger?.debug('Event was cancelled!');
            continue;
        }
        if (isEventInvalid(tick, event)) {
            tick.logger?.error(`A write effect made the event invalid! One of these is broken: ${JSON.stringify(preSettleSigils.writers)}`);
            throw FightError.create(ErrorType.InvalidEvent);
        }
        if (signals.prepend.length) {
            tick.queue.unshift(...signals.prepend, originalEvent);
            tick.logger?.debug(`Delayed by ${signals.prepend.length} events: ${JSON.stringify(signals.prepend.map(e => e.type))}`);
            continue;
        }

        if (signals.default) tick.logger?.debug('Default effect was cancelled!');
        else defaultEffects.preSettle[event.type]?.call(tick, event as never);

        for (const sigilPos of preSettleSigils.readers) {
            sigilCtx.pos = sigilPos[0];
            sigils[sigilPos[1]].readers![event.type]!.call(sigilCtx, event as never);
        }

        await fillEvent(tick, event);

        // TODO: maybe group some events?

        eventSettlers[event.type](tick.fight, event as never);
        tick.settled.push(event);

        if (!signals.default) defaultEffects.postSettle[event.type]?.call(tick, event as never);

        const postSettleSigils = getActiveSigils(tick, event, targets, ['cleanup', 'requests']);

        for (const sigilPos of postSettleSigils.cleanup) {
            sigilCtx.pos = sigilPos[0];
            sigils[sigilPos[1]].cleanup![event.type]!.call(sigilCtx, event as never);
        }

        let waitingFor: FightHost['waitingFor'] | null = null;
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

        tick.queue.unshift(...stack);
        if (waitingFor) {
            tick.host.backlog = tick.queue.splice(0, tick.queue.length);
            tick.host.waitingFor = waitingFor;
            const reqEvent = { type: 'request', ...pick(waitingFor, ['side', 'req']) } as const;
            eventSettlers.request(tick.fight, reqEvent);
            tick.settled.push(reqEvent);
            tick.logger?.debug('Halting for request');
            break;
        }
    }
}
