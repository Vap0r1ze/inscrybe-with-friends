import styles from './DevMenu.module.css';
import { useCallback, useState } from 'react';
import { Text } from './Text';
import { Button } from './inputs/Button';
import { PrintList } from './ui/PrintList';
import { useGameStore } from '@/hooks/useGameStore';
import { initCardFromPrint } from '@/lib/engine/Card';
import { rulesets } from '@/lib/defs/prints';
import { useClientStore } from '@/hooks/useClientStore';

export interface DevMenuProps {
    id: string
    onClose?: () => void
}
export function DevMenu({ id, onClose }: DevMenuProps) {
    const ruleset = useClientStore(state => state.clients[id]?.fight.opts.ruleset);
    const prints = ruleset ? rulesets[ruleset].prints : null;

    const [spawning, setSpawning] = useState(false);
    const onSpawnCard = useCallback((printId: string) => {
        if (!prints) return;
        useGameStore.getState().createEvent(id, {
            type: 'draw',
            side: 'player',
            card: initCardFromPrint(prints, printId),
        });
    }, [id, prints]);
    const onGiveEnergy = () => {
        useGameStore.getState().createEvent(id, {
            type: 'energy',
            side: 'player',
            amount: 1,
        });
    };
    const onGiveBone = () => {
        useGameStore.getState().createEvent(id, {
            type: 'bones',
            side: 'player',
            amount: 1,
        });
    };

    return <div className={styles.menu}>
        <div className={styles.actions}>
            <Button onClick={onClose}><Text size={14}>Close</Text></Button>
            <Button onClick={() => setSpawning(true)} disabled={!prints}><Text size={14}>Spawn Card</Text></Button>
            <Button onClick={onGiveEnergy}><Text size={14}>Energy +1</Text></Button>
            <Button onClick={onGiveBone}><Text size={14}>Bones +1</Text></Button>
        </div>
        {spawning && ruleset && <div className={styles.prints}>
            <PrintList editable onSelect={onSpawnCard} showNames ruleset={ruleset} />
        </div>}
    </div>;
}
