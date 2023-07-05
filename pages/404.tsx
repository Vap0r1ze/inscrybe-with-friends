import { Text } from '@/components/ui/Text';
import styles from './app.module.css';

export default function NotFound() {
    return <div className={styles.notFound}>
        <Text size={20}>404</Text>
        <div className={styles.notFoundDiv}></div>
        <Text size={16}>Page not found</Text>
    </div>;
}
