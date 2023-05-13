export function assert(value: unknown, issue: string): asserts value {
    if (value) return;

    console.error(issue);
}
