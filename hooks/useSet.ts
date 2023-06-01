import { useCallback, useState } from 'react';

export function useSet<T>(items: T[] = []) {
    const [set, setSet] = useState(items);

    const add = useCallback((item: T) => setSet(set => set.includes(item) ? set : [...set, item]), []);
    const remove = useCallback((item: T) => setSet(set => set.includes(item) ? set.filter(i => i !== item) : set), []);
    const toggle = useCallback((item: T) => setSet(set => set.includes(item) ? set.filter(i => i !== item) : [...set, item]), []);
    const clear = useCallback(() => setSet(set => set.length ? [] : set), []);

    return [set, { add, remove, toggle, clear }] as const;
}
