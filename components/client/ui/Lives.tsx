import { FightSide } from '@/lib/engine/Fight';
import styles from './Lives.module.css';
import { memo } from 'react';
import { useFight } from '@/hooks/useClientStore';
import { Sprite } from '@/components/sprites/Sprite';
import { useBattleSheet } from '@/hooks/useBattleTheme';

export interface LivesProps {
    side: FightSide
}
export const Lives = memo(function Lives({ side }: LivesProps) {
    const sheet = useBattleSheet();
    const fightLives = useFight(fight => fight.opts.lives);
    const deaths = useFight(fight => fight.players[side].deaths);
    const lives = fightLives - deaths;

    return <div className={styles.lives}>
        <Sprite sheet={sheet} name={`candleHolder${fightLives}`} />
        {Array.from({ length: fightLives }, (_, i) => (
            <Sprite
                key={i}
                className={styles.candle}
                sheet={sheet}
                name={`${i < lives ? 'candle' : 'candleOut'}${i+1}`}
            />
        ))}
    </div>;
});
