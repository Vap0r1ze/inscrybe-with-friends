import styles from './GameEnd.module.css';
import { useContext, useEffect } from 'react';
import { ClientContext, useWinner } from '@/hooks/useClientStore';
import { Text } from '../ui/Text';
import { Box } from '../ui/Box';

export function GameEnd() {
    const gameId = useContext(ClientContext);
    const winner = useWinner();

    useEffect(() => {
        if (!winner) return;
    }, [winner]);

    if (!winner) return null;
    if (gameId === 'playtest') return null;
    return <div className={styles.winScreen}>
        <Box className={styles.winBox}>
            <Text size={18}>{winner === 'player' ? 'You win' : 'You lose'}</Text>
            <div className={styles.winActions}></div>
        </Box>
    </div>;
}
