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
