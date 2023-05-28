import styles from './edit-decks.module.css';
import { sideDecks } from '@/lib/defs/prints';
import { entries } from '@/lib/utils';
import { useState } from 'react';
import { Deck, useDeckStore } from '@/hooks/useDeckStore';
import { useStore } from '@/hooks/useStore';
import PrintList from '@/components/ui/PrintList';
import { AssetButton } from '@/components/inputs/AssetButton';
import { Select } from '@/components/inputs/Select';
import { Text } from '@/components/Text';
import { Button } from '@/components/inputs/Button';
import { getSideDeckPrintIds } from '@/lib/engine/Card';

function useDeck(init: Deck = { main: [], side: 'squirrels' }) {
    const [deck, setDeck] = useState(init);
    const addCard = (id: string) => setDeck({ ...deck, main: [...deck.main, id] });
    const removeCard = (idx: number) => setDeck({ ...deck, main: deck.main.filter((_, i) => i !== idx) });
    const setSide = (id: string) => setDeck({ ...deck, side: id });
    return [deck, { addCard, removeCard, setSide, setDeck }] as const;
}

export default function EditDecks() {
    const [deck, { addCard, removeCard, setSide, setDeck }] = useDeck();
    const [selectedDeck, setSelectedDeck] = useState('');
    const [deckNameInput, setDeckName] = useState('');
    const decks = useStore(useDeckStore, state => state.decks);

    const deckName = deckNameInput.trim();
    const noDeckSelected = !(selectedDeck && decks?.[selectedDeck]);
    const canSave = !noDeckSelected && (JSON.stringify(decks[selectedDeck]) !== JSON.stringify(deck) || deckName !== selectedDeck);
    const canMakeNew = noDeckSelected || (!!deckName && !decks?.[deckName]);

    const selectDeck = (name: string) => {
        setSelectedDeck(name);
        if (!name) return;
        setDeck(useDeckStore.getState().decks[name]);
        setDeckName(name);
    };
    const onDeckNameChange = (name: string) => {
        setDeckName(name);
    };
    const saveDeck = (tryRename = false) => {
        let name = deckName || selectedDeck;
        for (let i = 1; !name || (i > 1 && decks?.[name]); i++) name = `New Deck (${i})`;

        setDeckName(name);

        if (tryRename && selectedDeck && name !== selectedDeck)
            useDeckStore.getState().deleteDeck(selectedDeck);
        useDeckStore.getState().saveDeck(name, deck);
        setSelectedDeck(name);
    };
    const deleteDeck = (name: string) => {
        if (name === selectedDeck) {
            setDeck({ main: [], side: 'squirrels' });
            setSelectedDeck('');
        }
        useDeckStore.getState().deleteDeck(name);
    };

    const sideEntries = entries(sideDecks);
    const deckEntries = entries(decks ?? {});

    // TODO: figure out how to prevent deck select from flickering on create/rename

    return (
        <div className={styles.editor}>
            <div className={styles.controls}>
                <div className={styles.controlsRow}>
                    <Text text="Deck:    " size={14} />
                    <Select
                        options={deckEntries.map(([name]) => [name, name])}
                        disabled={!deckEntries.length}
                        value={selectedDeck}
                        content={deckNameInput}
                        placeholder="Select a Deck"
                        editable
                        onSelect={name => selectDeck(name)}
                        onEdit={name => onDeckNameChange(name)}
                    />
                    <div style={{ flex: 1 }} />
                    <div className={styles.actions}>
                        <AssetButton path="/assets/plus.png" title="Create New Deck" disabled={!canMakeNew} onClick={() => saveDeck()} />
                        <AssetButton path="/assets/disk.png" title="Save Deck" disabled={!canSave} onClick={() => saveDeck(true)} />
                        <AssetButton path="/assets/trash.png" title="Delete Deck" disabled={noDeckSelected} onClick={() => deleteDeck(selectedDeck!)} />
                    </div>
                </div>
                <div className={styles.controlsRow}>
                    <Button onClick={() => setDeck({ ...deck, main: [] })}>
                        <Text text="Clear Deck" size={12} />
                    </Button>
                    <div style={{ flex:1 }} />
                    <Text text={`${deck.main.length} card${deck.main.length === 1 ? '' : 's'}`} size={14} />
                </div>
            </div>
            <div className={styles.deck}>
                {!deck.main.length && <div className={styles.emptyDeck}>
                    <Text text="No cards in your deck, add them by selecting them on the right" size={14} />
                </div>}
                <PrintList editable prints={deck.main} onSelect={(id, idx) => removeCard(idx)} />
            </div>
            <div className={styles.sideDeck}>
                <PrintList stacked prints={getSideDeckPrintIds(sideDecks[deck.side])} />
                <div className={styles.sideDeckSelector}>
                    <Text text="Side Deck:" size={14} />
                    <Select
                        options={sideEntries.map(([id, sideDeck]) => [id, sideDeck.name])}
                        value={deck.side}
                        onSelect={id => setSide(id)}
                    />
                </div>
            </div>
            <div className={styles.prints}>
                <PrintList editable showNames onSelect={id => addCard(id)} />
            </div>
        </div>
    );
}
