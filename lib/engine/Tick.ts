import { Action, ActionRes, isActionInvalid } from './Actions';
import { CardPos, getBloods, getCardPower, getMoxes, initCardFromPrint } from './Card';
import { Event, eventSettlers, isEventInvalid, isEventType } from './Events';
import { FIGHT_SIDES, Fight, FightSide } from './Fight';
import { rulesets } from '../defs/prints';
import { Sigil, sigils } from '../defs/sigils';
import { getActiveSigils, createEffectContext, createCardContext, defaultEffects, getTargets, EffectSignals } from './Effects';
import { ErrorType, FightError } from './Errors';
import { clone } from '../utils';
import { FightAdapter, FightHost } from './Host';
import { pick } from 'lodash';
import { DECK_TYPES } from './Deck';
import { cardCanPush, positions } from './utils';
import { MOX_TYPES } from './constants';

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
    const { prints } = rulesets[tick.fight.opts.ruleset];

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
                // FIXME: Prevent excessive sacs, not sure the best way to do this yet
                // const isExcessive = sacBloods.slice(0, -1).reduce((a, b) => a + b, 0) >= print.cost.amount;
                // if (isExcessive) throw FightError.create(ErrorType.InvalidAction, 'You cannot sacrifice more than the required amount');

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
                    const needsDisplay = Object.entries(MOX_TYPES)
                        .filter(([name, gem]) => needs & gem)
                        .map(([name, gem]) => name)
                        .join(' + ');
                    throw FightError.create(ErrorType.InsufficientResources, `Requires ${needsDisplay} gem(s)`);
                }
            }

            stack.push({ type: 'play', card, pos: [side, action.lane], fromHand: [side, action.card] });
            break;
        }
        case 'hammer': {
            const { hammersPerTurn } = tick.fight.opts;
            if (hammersPerTurn !== -1 && tick.fight.players[side].turnHammers >= hammersPerTurn)
                throw FightError.create(ErrorType.InvalidAction, `You cannot hammer more than ${hammersPerTurn} time(s) per turn`);
            if (tick.fight.mustPlay[side] != null) throw FightError.create(ErrorType.InvalidAction, 'You must play your card');
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
    const { prints } = rulesets[tick.fight.opts.ruleset];
    if (event.type === 'draw' && !event.card) {
        const idx = tick.host.decks[event.side][event.source!].pop()!;
        const printId = tick.fight.decks[event.side][event.source!][idx];
        const card = initCardFromPrint(prints, printId);
        event.card = card;
    } else if (event.type === 'attack') {
        const target = tick.fight.field[event.to[0]][event.to[1]];
        if (target?.state.flipped) event.direct = true;
        event.damage ??= getCardPower(prints, tick.fight, event.from)!;
    } else if (event.type === 'move') {
        const [toSide, toLane] = event.to;
        if (tick.fight.field[toSide][toLane] != null) event.failed = true;
        if (toLane < 0 || toLane >= tick.fight.opts.lanes) event.failed = true;
    } else if (event.type === 'push') {
        const [side, lane] = event.from;
        if (!cardCanPush(lane, event.dx, tick.fight.field[side])) event.failed = true;
    }
}

const MAX_STACK_SIZE = 1000;

async function settleEvents(tick: FightTick) {
    const backlog = tick.host.backlog.splice(0, tick.host.backlog.length);
    if (backlog) tick.queue.push(...backlog);

    const ruleset = rulesets[tick.fight.opts.ruleset];
    let iterations = 0;

    for (let event = tick.queue.shift(); event; event = tick.queue.shift()) {
        if (iterations++ >= MAX_STACK_SIZE)
            throw FightError.create(ErrorType.MaxStackSize);

        tick.logger?.debug(`[Processing] ${JSON.stringify(event)}`);
        if (isEventInvalid(tick, event)) {
            tick.logger?.debug('Event was invalid!');
            continue;
        };

        const targets = getTargets(tick.fight, event);

        const preSettleSigils = getActiveSigils(tick, event, targets, ['preSettleWrite', 'preSettleRead']);

        const signals: EffectSignals = { event: false, default: false, prepend: [] };

        const stack: Event[] = [];
        const effectCtx = createEffectContext(tick, event, targets, signals, stack);
        const cardCtx = createCardContext(tick, effectCtx, null as unknown as CardPos);

        const originalEvent = clone(event);

        for (const sigilPos of preSettleSigils.preSettleWrite) {
            cardCtx.pos = sigilPos[0];
            // @ts-ignore
            sigils[sigilPos[1]].preSettleWrite![event.type]!.call(cardCtx, event, ruleset.sigilParams[sigilPos[1]]);
        }
        if (signals.event) {
            tick.logger?.debug('Event was cancelled!');
            continue;
        }
        if (isEventInvalid(tick, event)) {
            tick.logger?.error(`A write effect made the event invalid! One of these is broken: ${JSON.stringify(preSettleSigils.preSettleWrite)}`);
            throw FightError.create(ErrorType.InvalidEvent);
        }
        if (signals.prepend.length) {
            // @ts-ignore
            for (const key of Object.getOwnPropertySymbols(event)) originalEvent[key] = event[key];
            tick.queue.unshift(...signals.prepend, originalEvent);
            tick.logger?.debug(`Delayed by ${signals.prepend.length} events: ${JSON.stringify(signals.prepend.map(e => e.type))}`);
            continue;
        }

        if (signals.default) tick.logger?.debug('Default effect was cancelled!');
        else defaultEffects.preSettle[event.type]?.call(tick, clone(event as never));

        for (const sigilPos of preSettleSigils.preSettleRead) {
            cardCtx.pos = sigilPos[0];
            // @ts-ignore
            sigils[sigilPos[1]].preSettleRead![event.type]!.call(cardCtx, clone(event), ruleset.sigilParams[sigilPos[1]]);
        }

        await fillEvent(tick, event);

        // TODO: maybe group some events?

        eventSettlers[event.type](tick.fight, clone(event as never));
        tick.settled.push(event);

        if (!signals.default) defaultEffects.postSettle[event.type]?.call(tick, clone(event as never));

        const postSettleSigils = getActiveSigils(tick, event, targets, ['postSettle', 'requests']);

        for (const sigilPos of postSettleSigils.postSettle) {
            cardCtx.pos = sigilPos[0];
            // @ts-ignore
            sigils[sigilPos[1]].postSettle![event.type]!.call(cardCtx, clone(event), ruleset.sigilParams[sigilPos[1]]);
        }

        let waitingFor: FightHost['waitingFor'] | null = null;
        for (const sigilPos of postSettleSigils.requests) {
            cardCtx.pos = sigilPos[0];
            const request = sigils[sigilPos[1]].requests![event.type]!.callFor.call(cardCtx, clone(event as never));
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
            eventSettlers.request(tick.fight, clone(reqEvent));
            tick.settled.push(reqEvent);
            tick.logger?.debug('Halting for request');
            break;
        }

        // FIXME: KILL EVENTS TIED TO DEAD CARDS
        if (!isEventType(['perish', 'lifeLoss'], event)) {
            for (const side of FIGHT_SIDES) {
                for (const [lane, card] of tick.fight.field[side].entries()) {
                    if (card?.state.health === 0) {
                        if (tick.queue.some(event => event.type === 'perish' && positions.isSameField(event.pos, [side, lane]))) continue;
                        tick.queue.unshift({ type: 'perish', pos: [side, lane], cause: 'attack' });
                        tick.logger?.debug(`Triggered death at [${side}, ${lane}]`);
                    }
                }
            }
        }

        if (tick.queue.length === 0) {
            const sides = FIGHT_SIDES.slice().sort((a, b) => tick.fight.points[b] - tick.fight.points[a]);
            if (tick.fight.points[sides[0]] - tick.fight.points[sides[1]] >= 5) {
                for (const side of sides.slice(1)) {
                    tick.queue.unshift({ type: 'lifeLoss', side });
                }
            }
        }
    }
}
