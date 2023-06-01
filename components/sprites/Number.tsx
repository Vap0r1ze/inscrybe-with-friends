import styles from './Number.module.css';
import { Spritesheets } from '@/lib/spritesheets';
import { Sprite } from './Sprite';
import classNames from 'classnames';

export interface NumberProps {
    n: number;
    x?: boolean;
    className?: string;
}
export function Number({ n, x, className }: NumberProps) {
    let digits = n.toString().split('');

    if (x) digits.unshift('x');

    return <div className={classNames(styles.number, className, {
        [styles.x]: x,
    })}>
        {digits.map((d, i) => <div key={i} className={styles.digit}>
            <Sprite sheet={Spritesheets[x ? 'borderChars' : 'chars']} name={d} />
        </div>)}
    </div>;
}
