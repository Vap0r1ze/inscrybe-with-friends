import styles from './Hand.module.css';
import { namespacedIndexes } from '@/lib/utils';
import { useClientActions, useClientProp, useFight, useHolding } from '@/hooks/useClientStore';
import { CardSprite } from '../sprites/CardSprite';
import { prints } from '@/lib/defs/prints';
import classNames from 'classnames';
import { HoverBorder } from '../ui/HoverBorder';
import { CSSProperties, memo, useEffect, useRef } from 'react';
import { Sprite } from '../sprites/Sprite';
import { Spritesheets } from '@/lib/spritesheets';
import { DeckType } from '@/lib/engine/Deck';

export const Hand = memo(function Hand() {
    const isPlayTurn = useFight(fight => fight.turn.side === 'player' && fight.turn.phase === 'play');
    const canDraw = useFight(fight => fight.turn.side === 'player' && fight.turn.phase === 'draw');
    const hand = useFight(fight => fight.hands.player);
    const [pending] = useClientProp('pending');
    const [selected, setSelected] = useHolding();
    const { sendAction, sendResponse } = useClientActions();

    const choices = useFight(fight => {
        if (fight.waitingFor?.side !== 'player') return null;
        if (fight.waitingFor.req.type !== 'chooseDraw') return null;
        const deck = fight.decks.player[fight.waitingFor.req.deck];
        return fight.waitingFor.req.choices.map(choice => [deck[choice], choice] as const);
    });
    const canPlay = isPlayTurn && !choices;

    const onCardClick = (i: number) => {
        if (!canPlay) return;
        setSelected(selected === i ? null : i);
    };
    const draw = (deck: DeckType) => {
        if (!canDraw) return;
        setSelected(null);
        sendAction('draw', { deck });
    };
    const chooseDraw = (idx: number) => {
        if (!choices) return;
        sendResponse('chooseDraw', { idx });
    };

    const cardsElRef = useRef<HTMLDivElement>(null);

    return <div className={styles.hand}>
        <div ref={cardsElRef} className={classNames(styles.cards, {
            [styles.noPlay]: !canPlay,
        })}>
            {[...namespacedIndexes(hand, card => card.print)].map(([card, key], i) => (
                <div
                    key={key}
                    className={classNames(styles.card, {
                        [styles.selected]: selected === i,
                    })}
                    style={{
                        '--dx': `${hand.length - i}em`,
                    } as CSSProperties}
                    data-hover-target
                    onClick={() => onCardClick(i)}
                >
                    <CardSprite className={styles.cardSprite} print={prints[card.print]} state={card.state} />
                    {canPlay && <HoverBorder color="#d7e2a3" />}
                </div>
            ))}
            {choices && (
                <div className={styles.choices}>
                    {choices.map(([printId, i]) => (
                        <div
                            key={i}
                            className={classNames(styles.cardChoice)}
                            data-hover-target
                            onClick={() => chooseDraw(i)}
                        >
                            <CardSprite print={prints[printId]} />
                            <HoverBorder color="#d7e2a3" />
                        </div>
                    ))}
                </div>
            )}
        </div>
        <div className={classNames(styles.decks, {
            [styles.noDraw]: !canDraw || pending,
        })}>
            <div className={styles.deck} data-hover-target onClick={() => draw('main')}>
                <Sprite sheet={Spritesheets.cards} name="common_back" />
                <HoverBorder color="#d7e2a3" />
            </div>
            <div className={styles.deck} data-hover-target onClick={() => draw('side')}>
                <Sprite sheet={Spritesheets.cards} name="common_back" />
                <HoverBorder color="#d7e2a3" />
            </div>
        </div>
    </div>;
});
