import styles from './RightInfo.module.css';
import { useFight } from '@/hooks/useClientStore';
import { memo } from 'react';
import { Sprite } from '../sprites/Sprite';
import { Scale } from './ui/Scale';
import { useBattleSheet } from '@/hooks/useBattleTheme';
import { Lives } from './ui/Lives';

export const RightInfo = memo(function RightInfo() {
    const battleTheme = useBattleSheet();
    const points = useFight(fight => fight.points);

    return <div className={styles.right}>
        <Sprite className={styles.bg} sheet={battleTheme} name="boardRight" />
        <div className={styles.info}>
            <Lives side="opposing" />
            <Scale left={points.opposing} right={points.player} />
            <Lives side="player" />
        </div>
    </div>;
});
