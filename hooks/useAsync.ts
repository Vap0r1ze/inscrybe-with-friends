import { DependencyList, useEffect, useState } from 'react';

export function useAwaiter<T>(factory: () => Promise<T>, deps?: DependencyList[]) {
    const [state, setState] = useState<{
        value: T | null;
        error: unknown;
        pending: boolean;
    }>({
        value: null,
        error: null,
        pending: true,
    });

    useEffect(() => {
        if (!state.pending) setState({ ...state, pending: true });

        factory()
            .then(value => setState({ value, error: null, pending: false }))
            .catch(error => setState({ value: null, error, pending: false }));
    }, deps); // eslint-disable-line react-hooks/exhaustive-deps

    return [state.value, state.pending, state.error] as const;
}

export function useCallbackAsync<A extends any[], R>(cb: (...args: A) => Promise<R>) {
    const [pending, setPending] = useState(false);
    const cbAsync = async (...args: A) => {
        setPending(true);
        const res = await cb(...args);
        setPending(false);
        return res;
    };
    return [cbAsync, pending] as const;
}
