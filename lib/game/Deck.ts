import { Card } from './Card';

export type DeckType = 'main' | 'side';

export interface Deck {
    draw(): Card;
}
