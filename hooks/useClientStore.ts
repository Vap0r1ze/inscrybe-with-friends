import { create } from 'zustand';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { FIGHT_SIDES, Fight } from '@/lib/engine/Fight';
import { FightPacket } from '@/lib/engine/Tick';
import { Event, eventSettlers } from '@/lib/engine/Events';
import { useGameStore } from './useGameStore';
import { Action, ActionRes } from '@/lib/engine/Actions';
import { clone } from '@/lib/utils';
import { ErrorType, FightError } from '@/lib/engine/Errors';
import { triggerActionSound, triggerEventSound } from './useAudio';

export const ClientContext = createContext<string | null>(null);

interface FightClient {
    id: string;
    fight: Fight<'player'>;
    pending: boolean;
    settled: Event[];
    queue: Event[];
    holding?: number | null;
    animating?: { event: Event, timeout: number } | null;
    hammering?: boolean;
    errors: string[];
}

interface FightStore {
    clients: Partial<Record<string, FightClient>>;
    newClient: (id: string, fight: Fight<'player'>) => void;
    deleteClient: (id: string) => void;
    setClient: (id: string, mutator: (client: FightClient) => FightClient) => void;
    addPacket: (id: string, packet: FightPacket) => void;
    maybeConsume: (id: string) => void;
    commitEvent: (id: string, event: Event) => void;
}

export const useClientStore = create<FightStore>((set, get) => ({
    clients: {},
    newClient(id, fight) {
        set(state => ({
            clients: {
                ...state.clients,
                [id]: {
                    id,
                    fight,
                    pending: false,
                    settled: [],
                    queue: [],
                    errors: [],
                },
            },
        }));
    },
    deleteClient(id: string) {
        set(state => {
            const clients = { ...state.clients };
            delete clients[id];
            return { clients };
        });
    },
    setClient(id, mutator) {
        set(state => {
            const client = state.clients[id];
            if (!client) return state;
            return {
                clients: {
                    ...state.clients,
                    [id]: mutator(client),
                },
            };
        });
    },
    addPacket(id, packet) {
        this.setClient(id, client => ({ ...client, queue: [...client.queue, ...packet.settled] }));
        setTimeout(() => this.maybeConsume(id), 0);
    },
    maybeConsume(id) {
        const client = get().clients[id];
        if (!client) return;
        const [event] = client.queue;
        if (!event) return;
        this.commitEvent(id, event);
        const timeout = window.setTimeout(() => {
            if (get().clients[id]?.animating?.timeout !== timeout) return;
            this.setClient(id, client => ({ ...client, animating: null, settled: [...client.settled, event] }));
            this.maybeConsume(id);
        }, animationDurations[event.type] * 1000);
        this.setClient(id, client => ({ ...client, queue: client.queue.slice(1), animating: { event, timeout } }));
    },
    commitEvent(id, event) {
        const client = get().clients[id];
        if (!client) return;

        triggerEventSound(event);
        commitEvents(client, [clone(event)]);
        useClientStore.getState().setClient(id, client => client);
    },
}));

export function useClient(throwIfMissing?: false): FightClient | null;
export function useClient(throwIfMissing: true): FightClient;
export function useClient<T = FightClient>(throwIfMissing: true, selector: (client: FightClient) => T): T;
export function useClient<T = FightClient>(throwIfMissing?: boolean, selector: (client: FightClient) => T = (client => client as T)): T | null {
    const id = useContext(ClientContext);
    if (throwIfMissing && !id) throw new Error('Missing client context!');
    return useClientStore(state => {
        if (!id) return null;
        const client = state.clients[id];
        if (!client && throwIfMissing) throw new Error('Missing client!');
        if (!client) return null;
        return selector(client);
    });
}

type ErrorHandlers = Partial<Record<ErrorType, (error: FightError) => Promise<void> | void>>;
export function useClientActions() {
    const id = useContext(ClientContext);
    if (!id) throw new Error('Missing client context!');
    const ratelimitRef = useRef<number[]>([]);
    type Data<T extends 'action' | 'response'> = T extends 'action' ? Action : ActionRes;
    const send = useCallback(<T extends 'action' | 'response'>(
        type: T,
        data: Data<T>,
        handlers?: ErrorHandlers,
    ) => {
        if (useClientStore.getState().clients[id]?.pending) return;
        useClientStore.getState().setClient(id, client => ({ ...client, pending: true }));

        const startTime = Date.now();
        ratelimitRef.current.push(startTime);
        if (ratelimitRef.current.length >= 10) {
            const first = ratelimitRef.current[0];
            const last = ratelimitRef.current.at(-1)!;
            if (last - first < 3000) throw new Error(`Caught client in an action loop! Please report this! [${type}:${data.type}]`);
            ratelimitRef.current.shift();
        }

        const promise = type === 'action'
            ? useGameStore.getState().sendAction(id, data as Action)
            : useGameStore.getState().sendResponse(id, data as ActionRes);
        return promise.then(() => {
            console.log(
                '%s<%o> to %o took %oms',
                type === 'action' ? 'Action' : 'Response',
                data.type,
                id,
                Date.now() - startTime
            );
            if (type === 'action') triggerActionSound(data as Action);
        }).catch(error => {
            if (error instanceof FightError) {
                const handler = handlers?.[error.type];
                if (handler) return handler(error);
            };
            throw error;
        }).catch(error => {
            if (typeof error.message !== 'string') throw error;
            useClientStore.getState().setClient(id, client => ({
                ...client,
                errors: [...client.errors, error.message],
            }));
        }).catch(error => {
            console.error(error);
        }).finally(() => {
            useClientStore.getState().setClient(id, client => ({ ...client, pending: false }));
        });
    }, [id]);
    const sendAction = useCallback(<T extends Action['type']>(type: T, data: Omit<Action<T>, 'type'>, handlers?: ErrorHandlers) => {
        return send('action', { type, ...data } as unknown as Action, handlers);
    }, [send]);
    const sendResponse = useCallback(<T extends ActionRes['type']>(type: T, data: Omit<ActionRes<T>, 'type'>, handlers?: ErrorHandlers) => {
        return send('response', { type, ...data } as unknown as ActionRes, handlers);
    }, [send]);
    return { sendAction, sendResponse };
}

export function useFight<T>(selector: (fight: Fight<'player'>) => T): T {
    const client = useClient(true);
    return selector(client.fight);
}

export function useFightGetter() {
    const id = useContext(ClientContext);
    if (!id) throw new Error('Missing client context!');
    return useCallback(() => {
        const client = useClientStore.getState().clients[id];
        if (!client) throw new Error('Missing client!');
        return client.fight;
    }, [id]);
}

export function useClientProp<T extends keyof FightClient>(prop: T) {
    const client = useClient(true);
    const setProp = useCallback((value: FightClient[T]) => {
        useClientStore.getState().setClient(client.id, client => ({
            ...client,
            [prop]: value,
        }));
    }, [client.id, prop]);
    return [client[prop], setProp] as const;
}

export function useHolding() {
    const [holdingIdx, setHolding] = useClientProp('holding');
    const holdingMidplay = useClient(true, client => {
        if (client.animating?.event.type === 'play') {
            return client.animating.event.fromHand?.[1] === client.holding;
        }
    });
    const mustPlay = useFight(fight => fight.mustPlay.player);
    return [holdingMidplay ? null : (mustPlay ?? holdingIdx), setHolding] as const;
}

export function useWinner() {
    const fightLives = useFight(fight => fight.opts.lives);
    const players = useFight(fight => fight.players);
    const winner = useMemo(() => {
        for (const side of FIGHT_SIDES) {
            if (players[side].deaths >= fightLives) return FIGHT_SIDES.filter(s => s !== side)[0];
        }
        return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [players.opposing.deaths, players.player.deaths]);
    return winner;
}

function commitEvents(client: FightClient, events: Event[]) {
    const [fight, dirtyPaths] = createTrap(client.fight);
    for (const event of events) {
        // @ts-ignore
        eventSettlers[event.type](fight, event);

        // Fix displaced indexes
        if (client.holding != null && event.type === 'play' && event.fromHand?.[0] === 'player') {
            if (client.holding === event.fromHand[1]) client.holding = null;
            else if (client.holding > event.fromHand[1]) client.holding--;
        }
    }
    for (const path of dirtyPaths) {
        let parent: any = client.fight;
        let dirtyProp: string | null = null;
        for (const prop of path.split('.')) {
            if (dirtyProp) parent = parent[dirtyProp];
            if (parent == null) {
                console.warn('Missing parent for %o in %o', dirtyProp, `fight.${path}`);
                dirtyProp = null;
                break;
            }
            dirtyProp = prop;
        }
        if (dirtyProp && parent[dirtyProp] != null && typeof parent[dirtyProp] === 'object') {
            parent[dirtyProp] = Array.isArray(parent[dirtyProp])
                ? [...parent[dirtyProp]]
                : { ...parent[dirtyProp] };
        }
    }
}

function createTrap<T extends object>(root: T) {
    const dirtyPaths = new Set<string>();
    const cache = new Map<string, any>();
    const reverseProxy = new Map<object, object>();
    const makeTrap = <O extends object>(obj: O, path: string[]): O => {
        const trap = new Proxy(obj, {
            set(target, prop, value) {
                const originalObj = reverseProxy.get(value);
                if (originalObj) value = originalObj;
                for (let i = 0; i <= path.length; i++)
                    dirtyPaths.add(path.slice(0, i).join('.'));
                return Reflect.set(target, prop, value);
            },
            get(target, prop) {
                const value = Reflect.get(target, prop);
                if (typeof value !== 'object' || value == null || typeof prop === 'symbol') return value;
                const newPath = [...path, prop];
                const trap = cache.get(newPath.join('.')) ?? makeTrap(value, newPath);
                return trap;
            },
        });
        cache.set(path.join('.'), trap);
        reverseProxy.set(trap, obj);
        return trap;
    };
    return [makeTrap(root, []), dirtyPaths] as const;
}

export const animationDurations: Record<Event['type'], number> = {
    activate: 0.1,
    attack: 0.5,
    bones: 0.1,
    draw: 0.2,
    energy: 0.1,
    energySpend: 0.1,
    flip: 0.5,
    heal: 1,
    move: 0.5,
    push: 0.5,
    newSigil: 1,
    perish: 0.2,
    phase: 0,
    play: 0.2,
    request: 0.1,
    response: 0.1,
    shoot: 0.5,
    transform: 1,
    triggerAttack: 0,
    stats: 0.1,
    mustPlay: 0.1,
    lifeLoss: 0.2,
    points: 0.2,
};
