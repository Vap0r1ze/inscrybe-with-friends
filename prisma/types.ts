declare global {
    namespace PrismaJson {
        type DeckCards = import('@/lib/engine/Deck').DeckCards;
    }
}

export {};
