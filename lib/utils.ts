import randGen from 'seed-random';

export function assert(value: unknown, issue: string): asserts value {
    if (value) return;

    console.error(issue);
}

export function fromEntries<K extends string | number | symbol, V>(entries: Iterable<[K, V]>) {
    return Object.fromEntries(entries) as Record<K, V>;
}

export function entries<K extends string | number | symbol, V>(obj: Record<K, V>) {
    return Object.entries(obj) as [K, V][];
}

export function clone<T>(obj: T) {
    return JSON.parse(JSON.stringify(obj)) as T;
}

export function* namespacedIndexes<T>(list: T[], namespaceFn: (obj: T) => string) {
    const namespaces = new Map<string, number>();

    for (const obj of list) {
        const namespace = namespaceFn(obj);
        const index = namespaces.get(namespace) ?? 0;

        yield [obj, `${namespace}:${index}`] as const;

        namespaces.set(namespace, index + 1);
    }
}

export function includes<const T>(list: T[], item: unknown): item is T {
    return list.indexOf(item as T) !== -1;
}

export function shuffle<T>(list: T[], seed?: string) {
    const rand = seed == null ? randGen() : randGen(seed);

    if (list.constructor !== Array) throw new Error('Input is not an array');
    let i = list.length;

    while (0 !== i) {
        var j = Math.floor(rand() * (i--));

        var temp = list[i];
        list[i] = list[j];
        list[j] = temp;
    }
    return list;
}
