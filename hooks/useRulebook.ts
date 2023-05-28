import { create } from 'zustand';

interface RulebookStore {
    entry: string | null;
    open(entry: string): void;
    close(): void;
}

export const useRulebook = create<RulebookStore>(
    (set, get) => ({
        entry: null,
        open: (entry) => set({ entry }),
        close: () => set({ entry: null }),
    }),
);

export function openInRulebook(entry: string) {
    console.log(`Looking up [${entry}]`);
    // useRulebook.getState().open(entry);
}
