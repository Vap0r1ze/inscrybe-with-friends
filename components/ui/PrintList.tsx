import styles from './PrintList.module.css';
import { prints as allPrints } from '@/lib/defs/prints';
import { entries } from '@/lib/utils';
import { CardSprite } from '../sprites/CardSprite';
import { Text } from '../Text';
import classNames from 'classnames';
import { openInRulebook } from '@/hooks/useRulebook';

const allPrintEntries = entries(allPrints).filter(([, print]) => !print.banned);

export interface PrintListProps {
    onSelect?: (id: string, index: number) => void;
    editable?: boolean;
    stacked?: boolean;
    showNames?: boolean;
    prints?: string[];
    gap?: number;
}
export default function PrintList({ onSelect, editable, stacked, showNames, prints }: PrintListProps) {
    const printEntries = prints?.map(id => [id, allPrints[id]] as const) ?? allPrintEntries;
    return (
        <div className={classNames(styles.prints, {
            [styles.stacked]: stacked,
            [styles.editable]: editable,
        })}>
            {printEntries.map(([id, print], index) => (
                <div className={styles.print} key={index} onClick={() => onSelect?.(id, index)}>
                    {showNames && <div className={styles.printName} onContextMenu={e => {
                        e.preventDefault();
                        openInRulebook(print.name);
                    }}>
                        <Text fit text={print.name} />
                    </div>}
                    <CardSprite print={print} />
                </div>
            ))}
        </div>
    );
}
