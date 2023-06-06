import styles from './SpriteButton.module.css';
import { Spritesheet } from '@/lib/spritesheets';
import { Sprite } from '../../sprites/Sprite';
import classNames from 'classnames';

export interface SpriteButtonProps {
    sheet: Spritesheet;
    name: string;
    selected?: boolean;
    disabled?: boolean;
    onClick?: () => void;
}
export function SpriteButton({ disabled, selected, onClick, sheet, name }: SpriteButtonProps) {
    let prefix = '';
    if (disabled) prefix = 'Disabled';
    if (selected) prefix = 'Selected';
    return <div className={classNames(styles.btn, {
        [styles.disabled]: disabled,
    })} onClick={onClick}>
        <Sprite className={styles.normal} sheet={sheet} name={`${name}${prefix}`} />
        <Sprite className={styles.hover} sheet={sheet} name={`${name}Hover`} />
        <Sprite className={styles.active} sheet={sheet} name={`${name}Active`} />
    </div>;
}
