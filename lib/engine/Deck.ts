export const DECK_TYPES = ['main', 'side'] as const;
export type DeckType = typeof DECK_TYPES[number];

export type DeckCards = Record<DeckType, string[]>;
export type ShuffledDecks = Record<DeckType, number[]>;
