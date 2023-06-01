import styles from './SigilButton.module.css';
import { Spritesheets } from '@/lib/spritesheets';
import { Sprite } from '../sprites/Sprite';

export interface SigilButtonProps {
    sigil: string;
    onClick?: () => void;
}
export function SigilButton({ sigil, onClick }: SigilButtonProps) {
    return <div className={styles.button} onClick={onClick}>
        <div className={styles.buttonBase}>
            <Sprite sheet={Spritesheets.buttonSigils} name={sigil} />
        </div>
        <div className={styles.buttonBottom}></div>
    </div>;
}
