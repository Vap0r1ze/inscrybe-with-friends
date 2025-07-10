import styles from './CardSelection.module.css';
import { CSSProperties, memo, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import classNames from 'classnames';
import { CardOrPrint } from '@/lib/engine/Card';
import { CardSprite } from '@/components/sprites/CardSprite';
import { HoverBorder } from '@/components/ui/HoverBorder';
import { namespacedIndexes } from '@/lib/utils';
import { rulesets } from '@/lib/defs/prints';
import { useFight } from '@/hooks/useClientStore';
import { triggerSound } from '@/hooks/useAudio';
import { useElementSize } from '@mantine/hooks';

export interface CardSelectionProps {
    cards: CardOrPrint[];
    onSelect?: (idx: number) => void;
    value?: number | null;
    disabled?: boolean;
    prompt?: boolean;
    padding?: number;
}
export const CardSelection = memo(function CardSelection({
    cards,
    onSelect,
    value,
    disabled,
    prompt,
    padding = 0,
}: CardSelectionProps) {
    const prints = useFight(fight => rulesets[fight.opts.ruleset].prints);

    const { ref: cardsRef, width } = useElementSize<HTMLDivElement>();

    useEffect(() => {
        if (!cardsRef.current) return;
        cardsRef.current.style.setProperty('--c-sel-w', width + 'px');
    }, [width, cardsRef]);

    const onCardClick = (i: number) => {
        if (disabled) return;
        if (onSelect) {
            onSelect(i);
            triggerSound('blip');
        }
    };

    return <div ref={cardsRef} className={classNames(styles.cards, {
        [styles.disabled]: disabled,
        [styles.prompt]: prompt,
    })} style={{
        '--c-sel-len': `${cards.length}`,
        '--c-sel-pad': `${padding}em`,
    } as CSSProperties}>
        <AnimatePresence initial={false}>
            {[...namespacedIndexes(cards, card => card.print)].map(([card, key], i) => {
                const dxMid = (cards.length - 1)/2 - i;
                return <motion.div
                    key={key}
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className={classNames(styles.card, {
                        [styles.selected]: value === i,
                    })}
                    style={{
                        '--dxm': `${dxMid}`,
                    } as CSSProperties}
                    data-hover-blip={!disabled || null}
                    data-hover-target
                    onClick={() => onCardClick(i)}
                >
                    <CardSprite className={styles.cardSprite} print={prints[card.print]} state={card.state} />
                    {!disabled && onSelect && value != i && <HoverBorder color="--ui" />}
                </motion.div>;
            })}
        </AnimatePresence>
    </div>;
});
