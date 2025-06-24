import { DeckCards } from '@/lib/engine/Deck';
import { RouterOutputs, trpc } from '@/lib/trpc';
import { create } from 'zustand';
import { Deck } from '@prisma/client';

const remoteKey = Symbol('remote');

type DeckLocation = 'local' | typeof remoteKey;
type RemoteDeckData = {
    [K in DeckLocation]: DeckCards;
};
type RemoteDeckInfo = Pick<Deck, 'id' | 'name' | 'ruleset' | 'createdAt' | 'updatedAt'>;

export interface DeckStore {
    decks: Record<string, RemoteDeck>
}

export interface RemoteDeck extends RemoteDeckInfo, RemoteDeckData {}

export const useDeckStore = create<DeckStore>((set, get) => ({
    decks: {},
}));

if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('decks');
}

type QueriedDeck = RouterOutputs['decks']['getOwn'][number];
function importRemoteDeck(deck: QueriedDeck) {
    useDeckStore.setState((state) => {
        const { decks } = state;
        const { id, name, ruleset, createdAt, updatedAt } = deck;
        const deckData = {
            id,
            name,
            ruleset,
            createdAt: new Date(createdAt),
            updatedAt: updatedAt == null ? null : new Date(updatedAt),
            local: deck.cards,
            [remoteKey]: deck.cards,
        };
        decks[id] = deckData;
        return state;
    });
}

export function isCardsDirty(deckId: string, cards?: DeckCards) {
    const deck = useDeckStore.getState().decks[deckId];
    return JSON.stringify(cards ?? deck.local) !== JSON.stringify(deck[remoteKey]);
}

export type DeckSave = {
    name: string;
    ruleset: string;
    cards: DeckCards;
};
export function useDeckSync() {
    const remoteDecks = trpc.decks.getOwn.useQuery();
    const remoteSaveDeck = trpc.decks.save.useMutation({
        onSuccess: () => remoteDecks.refetch(),
    });
    const remoteDeleteDeck = trpc.decks.delete.useMutation({
        onSuccess: () => remoteDecks.refetch(),
    });

    for (const deck of remoteDecks.data ?? []) {
        importRemoteDeck(deck);
    }

    // Mutations
    function saveDeck(id: string | undefined, deckSave: DeckSave) {
        // if (id && !useDeckStore.getState().decks[id]) return;

        return new Promise<QueriedDeck>((resolve, reject) => {
            remoteSaveDeck.mutate({
                id,
                ...deckSave,
            }, {
                onSuccess: (deck) => resolve(deck),
                onError: (e) => reject(e),
            });
        });
    }
    function deleteDeck(id: string) {
        useDeckStore.setState((state) => {
            const { decks } = state;
            delete decks[id];
            return state;
        });
        remoteDeleteDeck.mutate({ id });
    }

    const decks = useDeckStore(state => state.decks);

    return {
        decks,
        isLoading: remoteDecks.isLoading,
        isSaving: remoteSaveDeck.isPending,
        isDeleting: remoteDeleteDeck.isPending,
        errorSaving: remoteSaveDeck.error,
        saveDeck,
        deleteDeck,
    };
}
