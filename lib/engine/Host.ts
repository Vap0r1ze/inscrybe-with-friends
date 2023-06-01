import { DeckType, ShuffledDecks } from '../engine/Deck';
import { FIGHT_SIDES, Fight, FightSide } from '../engine/Fight';
import { ActionReq } from './Actions';
import { Sigil } from '../defs/sigils';
import { Event } from './Events';
import { FightTick } from './Tick';
import { fromEntries } from '../utils';

export interface FightHost {
    fight: Fight<FightSide>;
    decks: Record<FightSide, ShuffledDecks>;
    backlog: Event[];
    waitingFor: {
        side: FightSide;
        req: ActionReq;
        sigil: Sigil;
        event: Event;
    } | null;
}

export function createFightHost(fight: Fight<FightSide>): FightHost {
    return {
        fight,
        decks: fromEntries(FIGHT_SIDES.map(side => [side, {
            main: [],
            side: [],
        }])),
        backlog: [],
        waitingFor: null,
    };
}

export interface FightAdapter {
    initDeck(this: FightTick, side: FightSide, deck: DeckType): Promise<number[]>;
}

export function createTick(host: FightHost, adapter: FightAdapter): FightTick {
    return {
        fight: host.fight,
        host,
        settled: [],
        queue: [],
        adapter,
    };
}
