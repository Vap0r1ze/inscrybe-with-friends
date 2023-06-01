import { sideDecks } from '@/lib/defs/prints';
import { getSideDeckPrintIds } from '@/lib/engine/Card';
import { Decks } from '@/lib/engine/Deck';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface DeckStore {
    decks: Record<string, Decks>,
    getNames: () => string[]
    saveDeck: (name: string, deck: Decks) => void
    deleteDeck: (name: string) => void
}

export const useDeckStore = create(
    persist<DeckStore>(
        (set, get) => ({
            decks: {},
            getNames: () => Object.keys(get().decks),
            deleteDeck: (name) => set({ decks: Object.fromEntries(Object.entries(get().decks).filter(([key]) => key !== name)) }),
            saveDeck: (name, deck) => set({ decks: { ...get().decks, [name]: deck } }),
        }),
        {
            name: 'decks',
            storage: createJSONStorage(() => localStorage),
            version: 1,
            migrate(persistedState: any, version) {
                if (version <= 0) {
                    const { decks } = persistedState as { decks: Record<string, any> };
                    for (const [, deck] of Object.entries(decks)) deck.side = getSideDeckPrintIds(sideDecks[deck.side]);
                }
                return persistedState as DeckStore;
            },
        }
    )
);
