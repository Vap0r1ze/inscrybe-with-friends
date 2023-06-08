import styles from './CardSelection.module.css';
import { CSSProperties, memo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import classNames from 'classnames';
import { CardOrPrint } from '@/lib/engine/Card';
import { CardSprite } from '@/components/sprites/CardSprite';
import { HoverBorder } from '@/components/ui/HoverBorder';
import { namespacedIndexes } from '@/lib/utils';
import { rulesets } from '@/lib/defs/prints';
import { isClient } from '@/utils/next';
import { useFight } from '@/hooks/useClientStore';
import { triggerSound } from '@/hooks/useAudio';

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

    const observerRef = useRef(isClient ? new ResizeObserver((entries) => {
        for (const { target } of entries) {
            if (!(target instanceof HTMLElement)) continue;
            target.style.setProperty('--c-sel-w', target.clientWidth + 'px');
        }
    }) : null);
    const cardsElRef = (cardEl: HTMLDivElement | null) => {
        if (cardEl) observerRef.current?.observe(cardEl);
        else observerRef.current?.disconnect();
    };
    const onCardClick = (i: number) => {
        if (disabled) return;
        if (onSelect) {
            onSelect(i);
            triggerSound('blip');
        }
    };

    return <div ref={cardsElRef} className={classNames(styles.cards, {
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
