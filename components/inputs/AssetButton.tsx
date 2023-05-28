import styles from './AssetButton.module.css';
import Asset from '../sprites/Asset';

interface AssetButtonProps {
    path: string;
    title?: string;
    disabled?: boolean;
    onClick?: () => void;
}
export function AssetButton({ path, disabled, title, onClick }: AssetButtonProps) {
    return <button className={styles.button} title={title} disabled={disabled} onClick={onClick}>
        <Asset path={path}/>
    </button>;
}
