import styles from './RightInfo.module.css';
import { useFight } from '@/hooks/useClientStore';
import { memo } from 'react';
import { Sprite } from '../sprites/Sprite';
import { Scale } from './ui/Scale';
import { useBattleTheme } from '@/hooks/useBattleTheme';

export const RightInfo = memo(function RightInfo() {
    const battleTheme = useBattleTheme();
    const points = useFight(fight => fight.points);

    return <div className={styles.right}>
        <Sprite className={styles.bg} sheet={battleTheme} name="boardRight" />
        <div className={styles.info}>
            <Scale left={points.opposing} right={points.player} />
        </div>
    </div>;
});
