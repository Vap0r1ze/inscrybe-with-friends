import styles from './Bell.module.css';
import { Spritesheets } from '@/lib/spritesheets';
import { Sprite } from '../../sprites/Sprite';
import classNames from 'classnames';

export interface BellProps {
    disabled?: boolean;
    onClick?: () => void;
}
export function Bell({ disabled, onClick }: BellProps) {
    return <div className={classNames(styles.bell, {
        [styles.disabled]: disabled,
    })} onClick={onClick}>
        <Sprite className={styles.normal} sheet={Spritesheets.battle} name={disabled ? 'bellDisabled' : 'bell'} />
        <Sprite className={styles.hover} sheet={Spritesheets.battle} name="bellHover" />
        <Sprite className={styles.active} sheet={Spritesheets.battle} name="bellActive" />
    </div>;
}
