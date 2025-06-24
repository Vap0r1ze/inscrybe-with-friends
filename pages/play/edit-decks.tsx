import styles from './edit-decks.module.css';
import { rulesets } from '@/lib/defs/prints';
import { entries } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';
import { isCardsDirty, useDeckSync } from '@/hooks/useDeckStore';
import { PrintList } from '@/components/ui/PrintList';
import { AssetButton } from '@/components/inputs/AssetButton';
import { Select } from '@/components/inputs/Select';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/inputs/Button';
import { getSideDeckPrintIds } from '@/lib/engine/Card';
import { Box } from '@/components/ui/Box';
import { DeckCards } from '@/lib/engine/Deck';

function useDeck(init: DeckCards) {
    const [deck, setDeck] = useState(init);
    const addCard = (id: string) => setDeck(deck => ({ ...deck, main: [...deck.main, id] }));
    const removeCard = (idx: number) => setDeck(deck => ({ ...deck, main: deck.main.filter((_, i) => i !== idx) }));
    const setSide = (ids: string[]) => setDeck(deck => ({ ...deck, side: ids }));
    return [deck, { addCard, removeCard, setSide, setDeck }] as const;
}

export default function EditDecks() {
    const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
    const [deckNameInput, setDeckName] = useState('');
    const [selectedRuleset, setSelectedRuleset] = useState(Object.keys(rulesets)[0]);
    // TODO: unpair side-decks from rulesets, (add 'custom' option for when side deck isnt part of ruleset)
    const [defaultSideDeckId, defaultSideDeck] = Object.entries(rulesets[selectedRuleset].sideDecks)[0];
    const [selectedSideDeck, setSelectedSideDeck] = useState(defaultSideDeckId);
    const [deck, { addCard, removeCard, setSide, setDeck }] = useDeck({
        main: [],
        side: getSideDeckPrintIds(defaultSideDeck),
    });
    const {
        decks,
        saveDeck,
        deleteDeck,
        isLoading,
        isDeleting,
        isSaving,
        errorSaving,
    } = useDeckSync();

    const deckName = deckNameInput.trim();
    const hasDeckSelected = !!(selectedDeckId && decks[selectedDeckId]);

    let isDirty = false;
    if (hasDeckSelected) {
        isDirty ||= isCardsDirty(selectedDeckId, deck);
        isDirty ||= deckName !== decks[selectedDeckId].name;
        isDirty ||= selectedRuleset !== decks[selectedDeckId].ruleset;
    }

    const canMakeNew = !isDirty;

    useEffect(() => {
        function onBeforeUnload(event: BeforeUnloadEvent) {
            if (isDirty) event.preventDefault();
        }
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [isDirty]);

    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(() => {
        if (!hasDeckSelected) return;

        decks[selectedDeckId].local = deck;
    }, [decks, deck, selectedDeckId]);
    /* eslint-enable react-hooks/exhaustive-deps */

    const onSelectDeck = (id: string) => {
        setSelectedDeckId(id);
        if (!id) return;
        setDeck(decks[id].local);
        setDeckName(decks[id].name);
    };
    const onDeckNameChange = (name: string) => {
        setDeckName(name);
    };

    const onCreateDeck = () => {
        let deckToCreate = deck;
        let deckNameToCreate = deckName;
        if (hasDeckSelected) {
            const defaultSideDeck = Object.keys(rulesets[selectedRuleset].sideDecks)[0];
            deckToCreate = { main: [], side: getSideDeckPrintIds(rulesets[selectedRuleset].sideDecks[defaultSideDeck]) };
            setDeck(deckToCreate);
            setSelectedSideDeck(defaultSideDeck);
            deckNameToCreate = '';
        }

        // TODO: add (x) counter for conflicts
        if (!deckNameToCreate) {
            for (let i = 1; i < 100; i++) {
                deckNameToCreate = `New Deck (${i})`;
                if (!Object.values(decks).some(deck => deck.name === deckNameToCreate)) break;
            }
        };
        setDeckName(deckNameToCreate);

        saveDeck(selectedDeckId ?? undefined, {
            name: deckNameToCreate,
            ruleset: selectedRuleset,
            cards: deckToCreate,
        }).then((deck) => {
            setSelectedDeckId(deck.id);
            setDeckName(deck.name);
        });
    };
    const onSaveDeck = () => {
        if (!hasDeckSelected) return;
        saveDeck(selectedDeckId, {
            name: deckName,
            ruleset: selectedRuleset,
            cards: deck,
        });
    };
    const onDeleteDeck = (id: string) => {
        if (id === selectedDeckId) {
            setDeck({ main: [], side: getSideDeckPrintIds(defaultSideDeck) });
            setSelectedDeckId(null);
            setDeckName('');
        }
        deleteDeck(id);
    };
    const onChangeRuleset = (id: string) => {
        if (id === selectedRuleset) return;
        const defaultSideDeck = Object.keys(rulesets[id].sideDecks)[0];
        setSelectedRuleset(id);
        setSelectedSideDeck(defaultSideDeck);
        setDeck({ main: [], side: getSideDeckPrintIds(rulesets[id].sideDecks[defaultSideDeck]) });
        setDeckName('');
        setSelectedDeckId(null);
    };

    /* eslint-disable react-hooks/exhaustive-deps */
    const onSideDeckSelect = useCallback((id: string) => {
        setSelectedSideDeck(id);
        setSide(getSideDeckPrintIds(rulesets[selectedRuleset].sideDecks[id]));
    }, []);
    const onPrintSelect = useCallback((id: string) => addCard(id), []);
    const onDeckPrintSelect = useCallback((id: string, idx: number) => removeCard(idx), []);
    const onClearDeck = useCallback(() => setDeck(deck => ({ ...deck, main: [] })), []);
    /* eslint-enable react-hooks/exhaustive-deps */

    const sideEntries = entries(rulesets[selectedRuleset].sideDecks);
    const deckEntries = entries(decks).sort(([, { name: a }], [, { name: b }]) => a.localeCompare(b));

    // TODO: figure out how to prevent deck select from flickering on create/rename

    return (
        <div className={styles.editor}>
            <Box className={styles.controls}>
                <div className={styles.controlsRow}>
                    <Select
                        className={styles.select}
                        options={entries(rulesets).map(([id, ruleset]) => [id, ruleset.name])}
                        value={selectedRuleset}
                        placeholder="Select Ruleset"
                        onSelect={id => onChangeRuleset(id)}
                    />
                    <Select
                        className={styles.select}
                        options={deckEntries.map(([, { id, name }]) => [id, name])}
                        disabled={!deckEntries.length}
                        value={selectedDeckId}
                        content={deckNameInput}
                        placeholder="Select a Deck"
                        editable
                        onSelect={id => onSelectDeck(id)}
                        onEdit={name => onDeckNameChange(name)}
                    />
                    <div style={{ flex: 1 }} />
                    <Button onClick={onClearDeck}>
                        <Text size={12}>Clear Deck</Text>
                    </Button>
                </div>
                <div className={styles.controlsRow}>
                    <div className={styles.actions}>
                        <AssetButton path="/assets/plus.png" title="Create New Deck" disabled={!canMakeNew} onClick={() => onCreateDeck()} />
                        <AssetButton path="/assets/disk.png" title="Save Deck" disabled={!isDirty || isSaving} onClick={() => onSaveDeck()} />
                        <AssetButton path="/assets/trash.png" title="Delete Deck" disabled={!hasDeckSelected || isDeleting} onClick={() => onDeleteDeck(selectedDeckId!)} />
                        <AssetButton
                            // disabled={!isDirty || isSaving}
                            disabled
                            path={`/assets/${!isDirty ? 'cloudgreen' : errorSaving ? 'cloudred' : 'cloud'}.png`}
                            title={!isDirty ? 'Synced' : errorSaving ? 'Error while saving deck' : 'Syncing'}
                            onClick={() => onSaveDeck()}
                        />
                    </div>
                    <div style={{ flex:1 }} />
                    <Text size={14}>{`${deck.main.length}`} card{deck.main.length === 1 ? '' : 's'}</Text>
                </div>
            </Box>
            <div className={styles.deck}>
                {!deck.main.length && <div className={styles.emptyDeck}>
                    <Text size={14}>No cards in your deck, add them by selecting them on the right</Text>
                </div>}
                <PrintList editable prints={deck.main} onSelect={onDeckPrintSelect} ruleset={selectedRuleset} />
            </div>
            <Box className={styles.sideDeck}>
                <PrintList stacked prints={deck.side} ruleset={selectedRuleset} />
                <div className={styles.sideDeckSelector}>
                    <Text size={14}>Side Deck:</Text>
                    <Select
                        options={sideEntries.map(([id, sideDeck]) => [id, sideDeck.name])}
                        value={selectedSideDeck}
                        onSelect={onSideDeckSelect}
                    />
                </div>
            </Box>
            <div className={styles.prints}>
                <PrintList editable showNames onSelect={onPrintSelect} ruleset={selectedRuleset} />
            </div>
        </div>
    );
}
