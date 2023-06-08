import { Number } from '@/components/sprites/Number';
import styles from './Scale.module.css';
import { Sprite } from '@/components/sprites/Sprite';
import { useBattleSheet } from '@/hooks/useBattleTheme';
import { CSSProperties } from 'react';

export interface ScaleProps {
    left: number;
    right: number;
}
export function Scale({ left, right }: ScaleProps) {
    const battleTheme = useBattleSheet();
    const points = Math.min(5, Math.max(-5, right - left));

    return (
        <div className={styles.scale} style={{ '--points': points } as CSSProperties}>
            <div className={styles.bowlLeft}>
                <Sprite sheet={battleTheme} name="scaleBowl" />
                <Number className={styles.points} x n={left} />
            </div>
            <div className={styles.bowlRight}>
                <Sprite sheet={battleTheme} name="scaleBowl" />
                <Number className={styles.points} x n={right} />
            </div>
            <Sprite className={styles.beam} sheet={battleTheme} name="scaleBeam" />
            <Sprite className={styles.marker} sheet={battleTheme} name="scaleMarker" />
            <Sprite sheet={battleTheme} name="scale" className={styles.ruler} />
            <Sprite sheet={battleTheme} name="scaleBase" className={styles.base} />
        </div>
    );
}
