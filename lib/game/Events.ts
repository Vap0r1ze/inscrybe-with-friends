import { Card } from './Card';
import { DeckType } from './Deck';
import { Side } from './Match';

export type Event = DrawEvent | NewCardEvent;

export type DrawEvent = {
    type: 'draw';
    card: Card;
    deck: DeckType;
};

export type NewCardEvent = {
    type: 'new-card';
    card: Card;
};

export type AttackEvent = {
    type: 'attack';
    lane: number;
    side: Side;
};

export type PlayEvent = {
    type: 'play';
    lane: number;
    side: Side;
    card: Card;
};
