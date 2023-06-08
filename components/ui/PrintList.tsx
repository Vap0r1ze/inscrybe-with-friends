import styles from './PrintList.module.css';
import { rulesets } from '@/lib/defs/prints';
import { entries } from '@/lib/utils';
import { CardSprite } from '../sprites/CardSprite';
import { Text } from './Text';
import classNames from 'classnames';
import { openInRulebook } from '@/hooks/useRulebook';
import { memo, useMemo } from 'react';
import { HoverBorder } from './HoverBorder';

export interface PrintListProps {
    ruleset: string;
    onSelect?: (id: string, index: number) => void;
    editable?: boolean;
    stacked?: boolean;
    showNames?: boolean;
    prints?: string[];
    gap?: number;
}
export const PrintList = memo(function PrintList({ onSelect, editable, stacked, showNames, prints, ruleset }: PrintListProps) {
    const allPrints = useMemo(() => {
        return rulesets[ruleset].prints;
    }, [ruleset]);
    const allPrintEntries = useMemo(() => {
        return entries(allPrints).filter(([id, print]) => !print.banned);
    }, [allPrints]);
    const printEntries = prints?.map(id => [id, allPrints[id]] as const) ?? allPrintEntries;

    return (
        <div className={classNames(styles.prints, {
            [styles.editable]: editable,
        })}>
            {printEntries.map(([id, print], index) => (
                <div
                    key={index}
                    className={classNames(styles.print, {
                        [styles.stacked]: stacked && printEntries[index + 1]?.[0] === id,
                    })}
                    data-hover-target
                    data-hover-blip
                    onClick={() => onSelect?.(id, index)}
                >
                    {showNames && <div className={styles.printName} onContextMenu={e => {
                        e.preventDefault();
                        openInRulebook(`print:${id}`);
                    }}>
                        <Text fit>{print.name}</Text>
                    </div>}
                    <CardSprite print={print} />
                    <HoverBorder color="--ui" top={showNames ? -1 : 0}/>
                </div>
            ))}
        </div>
    );
});
