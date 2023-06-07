import styles from './Range.module.css';
import { useState } from 'react';
import { Button } from './Button';
import { Spritesheet } from '@/lib/spritesheets';
import { Sprite } from '../sprites/Sprite';
import classNames from 'classnames';

const sheet: Spritesheet = {
    path: '/assets/sliders.png',
    size: [45, 30],
    tiled: {
        borderWidth: { in: 0, out: 0 },
        tileSize: [15, 18],
    },
    sprites: {
        on: [0, 0],
        off: [1, 0],
        soundOn: [2, 0],
        incr: [1, 18, 12, 12],
        decr: [13, 18, 12, 12],
    },
};

export interface RangeProps {
    className?: string;
    type?: string;
    min: number;
    max: number;
    steps: number;
    value?: number;
    onChange?: (value: number) => void;
}
export function Range({ className, type, min, max, steps, value, onChange }: RangeProps) {
    const [inputStep, setStep] = useState(0);
    const step = value != null ? (value - min) * steps : inputStep;
    const changeStep = (newStep: number) => {
        newStep = Math.max(0, Math.min(steps, newStep));
        if (onChange) onChange(min + newStep / steps * (max - min));
        else setStep(newStep);
    };

    const onSprite = type && sheet.sprites[`${type}On`] ? `${type}On` : 'on';
    const offSprite = type && sheet.sprites[`${type}Off`] ? `${type}Off` : 'off';

    return <div className={classNames(styles.slider, className)}>
        <Button className={styles.button} onClick={() => changeStep(step - 1)}>
            <Sprite className={styles.buttonInner} sheet={sheet} name="decr" />
        </Button>
        <div className={styles.steps}>
            {Array.from({ length: steps }, (v, i) => (
                <div key={i} className={classNames(styles.step, {
                    [styles.off]: step < (i + 1),
                })} onClick={() => changeStep(i + 1)}>
                    <Sprite className={styles.onStep} sheet={sheet} name={onSprite} />
                    <Sprite className={styles.offStep} sheet={sheet} name={offSprite} />
                </div>
            ))}
        </div>
        <Button className={styles.button} onClick={() => changeStep(step + 1)}>
            <Sprite className={styles.buttonInner} sheet={sheet} name="incr" />
        </Button>
    </div>;
}
