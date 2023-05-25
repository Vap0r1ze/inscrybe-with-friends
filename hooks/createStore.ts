import { useEffect, useReducer } from 'react';

export function createStore<T>(init: T) {
    let state = init;
    const subscribers = new Set<(state: T) => void>();

    const setStore = (newState: T) => {
        state = newState;
        subscribers.forEach(subscriber => subscriber(state));
    };

    const useStore = () => {
        const [, forceUpdate] = useReducer(() => ({}), {});
        useEffect(() => {
            subscribers.add(forceUpdate);
            return () => void subscribers.delete(forceUpdate);
        });
        return [state, setStore] as const;
    };

    return [useStore, setStore] as const;
}

export function createKVStore<T extends Record<string, any>>(init: T) {
    const [useStore, setStore] = createStore(init);
    const setValue = <K extends keyof T>(key: K, value: T[K]) => setStore({ ...init, [key]: value });
    return [useStore, setValue] as const;
}
