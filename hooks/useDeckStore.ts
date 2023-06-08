import { DeckCards } from '@/lib/engine/Deck';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface DeckStore {
    rulesets: Record<string, Record<string, DeckCards>>,
    getNames: (ruleset: string) => string[]
    saveDeck: (ruleset: string, name: string, deck: DeckCards) => void
    deleteDeck: (ruleset: string, name: string) => void
}

export const useDeckStore = create(
    persist<DeckStore>(
        (set, get) => ({
            rulesets: {},
            getNames: (ruleset) => Object.keys(get().rulesets[ruleset]),
            deleteDeck: (ruleset, name) => set(state => ({ rulesets: {
                ...state.rulesets,
                [ruleset]: Object.fromEntries(Object.entries(state.rulesets[ruleset]).filter(([key]) => key !== name)),
            } })),
            saveDeck: (ruleset, name, deck) => set(state => ({ rulesets: {
                ...state.rulesets,
                [ruleset]: {
                    ...state.rulesets[ruleset],
                    [name]: deck,
                },
            } })),
        }),
        {
            name: 'decks',
            storage: createJSONStorage(() => localStorage),
            version: 2,
            migrate(persistedState: any, version) {
                if (version <= 1) {
                    const { decks } = persistedState as { decks: Record<string, any> };
                    persistedState = { rulesets: { imfComp: decks } };
                }
                return persistedState as DeckStore;
            },
        }
    )
);
