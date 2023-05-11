export function matrix<T>(rows: number, cols: number, fill: T): T[][] {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}
