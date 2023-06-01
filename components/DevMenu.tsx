import { useCallback, useState } from 'react';
import styles from './DevMenu.module.css';
import { Text } from './Text';
import { Button } from './inputs/Button';
import { PrintList } from './ui/PrintList';
import { useGameStore } from '@/hooks/useGameStore';
import { initCardFromPrint } from '@/lib/engine/Card';
import { prints } from '@/lib/defs/prints';

export interface DevMenuProps {
    id: string
    onClose?: () => void
}
export function DevMenu({ id, onClose }: DevMenuProps) {
    const [spawning, setSpawning] = useState(false);
    const onSpawnCard = useCallback((printId: string) => {
        setSpawning(false);
        onClose?.();
        useGameStore.getState().createEvent(id, {
            type: 'draw',
            side: 'player',
            card: initCardFromPrint(prints, printId),
        });
    }, [onClose, id]);
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
            <Button onClick={() => setSpawning(true)}><Text size={14}>Spawn Card</Text></Button>
            <Button onClick={onGiveEnergy}><Text size={14}>Energy +1</Text></Button>
            <Button onClick={onGiveBone}><Text size={14}>Bones +1</Text></Button>
        </div>
        {spawning && <div className={styles.prints}>
            <PrintList editable onSelect={onSpawnCard} />
        </div>}
    </div>;
}
