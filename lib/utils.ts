import randGen from 'seed-random';

export function assert(value: unknown, issue: string): asserts value {
    if (value) return;

    console.error(issue);
}

export function fromEntries<K extends string | number | symbol, V>(entries: Iterable<readonly [K, V]>) {
    return Object.fromEntries(entries) as Record<K, V>;
}

export function entries<K extends string | number | symbol, V>(obj: { [key in K]?: V }) {
    return Object.entries(obj) as [K, V][];
}

export function assign<T extends object>(obj: T, ...sources: Partial<T>[]): T {
    return Object.assign(obj, ...sources);
}

export function clone<T>(obj: T) {
    return JSON.parse(JSON.stringify(obj)) as T;
}

export function intersperse<T, S>(list: T[], separator: S): (T | S)[] {
    return list.flatMap((item, i) => i > 0 ? [separator, item] : [item]);
}

export function intersperseFn<T, S>(list: T[], separator: (i: number) => S): (T | S)[] {
    return list.flatMap((item, i) => i > 0 ? [separator(i), item] : [item]);
}

export function join<T, J = T>(lists: T[][], joiner: J): (T | J)[] {
    return lists.flatMap((list, i) => i > 0 ? [joiner, ...list] : list);
}

export function random<T>(list: T[]) {
    return list[Math.floor(Math.random() * list.length)];
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

// Next Stuff

export const isClient = typeof window === 'object';

export function getBaseUrl() {
    if (isClient)
        return '';
    if (process.env.VERCEL_URL)
        return `https://${process.env.VERCEL_URL}`;
    return `http://localhost:${process.env.PORT ?? 3000}`;
}
