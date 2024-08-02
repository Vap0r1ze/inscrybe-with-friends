import { DeckCards } from '@/lib/engine/Deck';
import { trpc } from '@/lib/trpc';
import { mapValues } from 'lodash';
import { produce } from 'immer';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useMemo } from 'react';
import { clone, entries, fromEntries } from '@/lib/utils';

const remoteKey = Symbol('remote');

export interface DeckStore {
    rulesets: Record<string, Record<string, CloudDeck>>
}
export interface CloudDeck {
    local?: DeckCards;
    [remoteKey]?: DeckCards;
}

export const useDeckStore = create(
    persist<DeckStore>(
        (set, get) => ({
            rulesets: {},
        }),
        {
            name: 'decks',
            storage: createJSONStorage(() => localStorage),
            version: 3,
            migrate(persistedState: any, version) {
                if (version <= 1) {
                    const { decks } = persistedState as { decks: Record<string, any> };
                    persistedState = { rulesets: { imfComp: decks } };
                }
                if (version <= 2) {
                    const { rulesets } = persistedState as { rulesets: Record<string, Record<string, DeckCards>> };
                    const newRulesets: DeckStore['rulesets'] = mapValues(rulesets, (decks) => mapValues(decks, (deck) => ({
                        local: deck,
                    })));
                    persistedState = { rulesets: newRulesets };
                }
                return persistedState as DeckStore;
            },
        }
    )
);

function saveDeckIfFresh(loc: keyof CloudDeck, ruleset: string, name: string, deck: DeckCards) {
    useDeckStore.setState(state => produce(state, draft => {
        if (JSON.stringify(state.rulesets[ruleset]?.[name]?.[loc]) === JSON.stringify(deck)) return;
        draft.rulesets[ruleset] ??= {};
        if (!draft.rulesets[ruleset][name] && loc === remoteKey) {
            draft.rulesets[ruleset][name] = { [remoteKey]: deck, local: deck };
        } else {
            draft.rulesets[ruleset][name] ??= {};
            draft.rulesets[ruleset][name][loc] = deck;
        }
    }));
}
function deleteDeckIfExists(loc: keyof CloudDeck, ruleset: string, name: string) {
    useDeckStore.setState(state => produce(state, draft => {
        if (!state.rulesets[ruleset]?.[name]?.[loc]) return;
        const deck = draft.rulesets[ruleset][name];
        delete deck[loc];
        if (!deck[remoteKey] && !deck.local) delete draft.rulesets[ruleset][name];
    }));
}
function restoreDeck(ruleset: string, name: string) {
    const state = useDeckStore.getState();
    if (!state.rulesets[ruleset]?.[name]?.[remoteKey]) throw new Error('Tried to restore deck that has no remote copy');

    const deck = clone(state.rulesets[ruleset][name][remoteKey]!);
    useDeckStore.setState(state => produce(state, draft => {
        draft.rulesets[ruleset][name].local = deck;
    }));

    return deck;
}

export function useDeckSync() {
    const cloudDecks = trpc.decks.getOwn.useQuery();
    const cloudSaveDeck = trpc.decks.save.useMutation({
        onSuccess: () => cloudDecks.refetch(),
    });
    const cloudDeleteDeck = trpc.decks.delete.useMutation({
        onSuccess: () => cloudDecks.refetch(),
    });

    for (const { name, ruleset, cards } of cloudDecks.data ?? []) {
        saveDeckIfFresh(remoteKey, ruleset, name, cards);
    }

    // Mutations
    function saveDeck(ruleset: string, name: string, deck: DeckCards, renameTo?: string) {
        if (renameTo) deleteDeckIfExists('local', ruleset, name);
        saveDeckIfFresh('local', ruleset, renameTo ?? name, deck);

        cloudSaveDeck.mutate({ name, ruleset, cards: deck, rename: renameTo });
    }
    function deleteDeck(ruleset: string, name: string) {
        deleteDeckIfExists('local', ruleset, name);
        cloudDeleteDeck.mutate({ name });
    }

    const store = useDeckStore(state => state.rulesets);
    const decks = useMemo(() => {
        return mapValues(store, (decks) => {
            const localDeckEntries = entries(decks)
                .filter(([, deck]) => !!deck.local)
                .map(([name, deck]) => [name, {
                    cards: deck.local!,
                    state: JSON.stringify(deck[remoteKey]) === JSON.stringify(deck.local)
                        ? 'synced' : !deck[remoteKey] ? 'local' : 'conflict',
                }] as const);
            return fromEntries(localDeckEntries);
        });
    }, [store]);

    return {
        decks,
        isLoading: cloudDecks.isLoading,
        isSaving: cloudSaveDeck.isLoading,
        isDeleting: cloudDeleteDeck.isLoading,
        saveDeck,
        deleteDeck,
        restoreDeck,
    };
}
