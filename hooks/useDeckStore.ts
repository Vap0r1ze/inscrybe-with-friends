import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Deck {
    main: string[]
    side: string
}
interface DeckStore {
    decks: Record<string, Deck>,
    getNames: () => string[]
    saveDeck: (name: string, deck: Deck) => void
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
        }
    )
);
