import FitText from '@/components/FitText';
import styles from './edit-decks.module.css';
import { CardSprite } from '@/components/sprites/CardSprite';
import { prints } from '@/lib/defs/prints';
import { entries } from '@/lib/utils';

export default function EditDecks() {
    return <div className={styles.prints}>
        {entries(prints).map(([name, print]) => <div className={styles.print} key={name}>
            <div className={styles.printName}><FitText text={print.name} /></div>
            <CardSprite print={print} />
        </div>)}
    </div>;
}
