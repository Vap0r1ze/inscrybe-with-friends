import styles from './Hand.module.css';
import { useClientActions, useClientProp, useFight, useHolding } from '@/hooks/useClientStore';
import classNames from 'classnames';
import { HoverBorder } from '../ui/HoverBorder';
import { memo, useCallback, useMemo } from 'react';
import { Sprite } from '../sprites/Sprite';
import { Spritesheets } from '@/lib/spritesheets';
import { DeckType } from '@/lib/engine/Deck';
import { CardSelection } from './animations/CardSelection';

export const Hand = memo(function Hand() {
    const isPlayTurn = useFight(fight => fight.turn.side === 'player' && fight.turn.phase === 'play');
    const canDraw = useFight(fight => fight.turn.side === 'player' && fight.turn.phase === 'draw');
    const hand = useFight(fight => fight.hands.player);
    const [pending] = useClientProp('pending');
    const [selected, setSelected] = useHolding();
    const { sendAction, sendResponse } = useClientActions();

    const choiceDeck = useFight(fight => {
        if (fight.waitingFor?.side !== 'player') return null;
        if (fight.waitingFor.req.type !== 'chooseDraw') return null;
        return fight.decks.player[fight.waitingFor.req.deck];
    });
    const choiceIdxs = useFight(fight => {
        if (fight.waitingFor?.side !== 'player') return null;
        if (fight.waitingFor.req.type !== 'chooseDraw') return null;
        return fight.waitingFor.req.choices;
    });
    const choices = useMemo(() => {
        if (!choiceDeck || !choiceIdxs) return null;
        return choiceIdxs.map(idx => ({ print: choiceDeck[idx] }));
    }, [choiceDeck, choiceIdxs]);
    const canPlay = isPlayTurn && !choices;

    const onCardClick =  useCallback((i: number) => {
        if (!canPlay) return;
        setSelected(selected === i ? null : i);
    }, [canPlay, setSelected, selected]);
    const draw = (deck: DeckType) => {
        if (!canDraw) return;
        setSelected(null);
        sendAction('draw', { deck });
    };
    const chooseDraw = (i: number) => {
        if (!choiceIdxs) return;
        sendResponse('chooseDraw', { idx: choiceIdxs[i] });
    };

    return <div className={classNames(styles.hand, {
        [styles.canDraw]: canDraw,
    })} data-hover-target>
        {/* {canDraw && <HoverBorder color="var(--ui)" lineWidth={2} lineDash={[6, 4]} alwaysPlay />} */}
        <div className={styles.cardsArea}>
            <CardSelection padding={20} cards={hand} disabled={!canPlay} value={selected} onSelect={onCardClick} />
        </div>
        <div className={classNames(styles.decks, {
            [styles.noDraw]: !canDraw || pending,
        })}>
            <div className={styles.deck} data-hover-target onClick={() => draw('main')}>
                <Sprite sheet={Spritesheets.cards} name="common_back" />
                <HoverBorder color="--ui" />
            </div>
            <div className={styles.deck} data-hover-target onClick={() => draw('side')}>
                <Sprite sheet={Spritesheets.cards} name="common_back" />
                <HoverBorder color="--ui" />
            </div>
        </div>
        {choices && (
            <div className={styles.choices}>
                <CardSelection
                    cards={choices}
                    onSelect={chooseDraw}
                    prompt
                />
            </div>
        )}
    </div>;
});
