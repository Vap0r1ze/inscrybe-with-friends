import styles from './LeftInfo.module.css';
import { Number } from '../sprites/Number';
import { useFight } from '@/hooks/useClientStore';
import { memo } from 'react';

export const RightInfo = memo(function RightInfo() {
    const points = useFight(fight => fight.points);

    return <div className={styles.info}>
        <Number x n={points.opposing} />
        <Number x n={points.player - points.opposing} />
        <Number x n={points.player} />
    </div>;
});
