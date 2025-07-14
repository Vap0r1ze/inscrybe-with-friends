declare global {
    namespace PrismaJson {
        type DeckCards = import('@/lib/engine/Deck').DeckCards;

        interface ConnectionToken {
            refresh_token: string;
            access_token: string;
            expires_at: number;
            scope: string;
        }
    }
}

export {};
