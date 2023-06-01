import styles from './Board.module.css';
import { Spritesheets } from '@/lib/spritesheets';
import { Sprite } from '../sprites/Sprite';
import classNames from 'classnames';
import { useClientActions, useClientProp, useFight, useHolding } from '@/hooks/useClientStore';
import { memo, useCallback, useEffect, useRef } from 'react';
import { HoverBorder } from '../ui/HoverBorder';
import { CardSprite } from '../sprites/CardSprite';
import { prints } from '@/lib/defs/prints';
import { useSet } from '@/hooks/useSet';
import { getBloods } from '@/lib/engine/Card';
import { PlayedCard } from './animations/PlayedCard';
import { AnimatePresence } from 'framer-motion';

export const Board = memo(function Board() {
    const field = useFight(fight => fight.field);
    const hand = useFight(fight => fight.hands.player);
    const isPlayTurn = useFight(fight => fight.turn.side === 'player' && fight.turn.phase === 'play');
    const mustPlay = useFight(fight => fight.mustPlay.player);
    const [hammering, setHammering] = useClientProp('hammering');
    const [holdingIdx, setHolding] = useHolding();
    const [pending] = useClientProp('pending');
    const { sendAction, sendResponse } = useClientActions();
    const [sacs, { clear: clearSacs, toggle: toggleSac }] = useSet<number>();
    const wantsTarget = useFight(fight => fight.waitingFor?.req.type === 'snipe' && fight.waitingFor.side === 'player') && !pending;

    const holding = holdingIdx == null ? null : hand[holdingIdx];
    const holdingPrint = holding && prints[holding.print];
    const laneBloods = field.player.map((card) => getBloods(prints, [card]));
    let needsSac = false;
    if (holdingPrint?.cost?.type === 'blood') needsSac = laneBloods.reduce((a, b) => a + b) >= holdingPrint.cost.amount;

    const canPlayRef = useRef(false);
    canPlayRef.current = !!(isPlayTurn && !pending && holding);

    if (holdingPrint?.cost?.type === 'blood' && holdingIdx !== mustPlay) {
        canPlayRef.current = false;
    }

    const onTryPlay = useCallback((lane: number) => {
        if (holdingIdx == null || pending || !canPlayRef.current) return;
        sendAction('play', { lane, card: holdingIdx, sacs });
        clearSacs();
        setHolding(null);
        setHammering(false);
    }, [clearSacs, holdingIdx, pending, sacs, sendAction, setHolding, setHammering]);
    const onTarget = (lane: number) => {
        if (!wantsTarget) return;
        sendResponse('snipe', { lane });
        setHammering(false);
    };
    const onHammer = (lane: number) => {
        if (pending) return;
        sendAction('hammer', { lane });
        setHolding(null);
        setHammering(false);
    };
    const onActivate = useCallback((lane: number, sigil: string) => {
        if (pending) return;
        sendAction('activate', { lane, sigil });
        setHolding(null);
        setHammering(false);
    }, [pending, sendAction, setHolding, setHammering]);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const onActivateLane = field.player.map((card, i) => useCallback((sigil: string) => onActivate(i, sigil), [i]));

    useEffect(() => {
        if (holdingPrint?.cost?.type === 'blood') {
            const bloods = getBloods(prints, sacs.map(i => field.player[i]));
            if (bloods >= holdingPrint.cost.amount) {
                canPlayRef.current = true;
                onTryPlay(holdingIdx!);
            };
        }
    }, [field.player, holdingIdx, sacs, onTryPlay, holdingPrint?.cost]);

    useEffect(() => {
        clearSacs();
    }, [holding, clearSacs]);

    return <div className={styles.board}>
        <div data-z-plane className={classNames(styles.boardRow, styles.playerRow)}>
            {field.player.map((card, i) => (
                <div key={i} data-hover-target className={styles.cardSlot} onClick={() => onTryPlay(i)}>
                    <Sprite className={styles.cardSlotBase} sheet={Spritesheets.battle} name="slot" />
                    <Sprite className={styles.cardSlotHover} sheet={Spritesheets.battle} name="slotHover" />
                    {canPlayRef.current && <HoverBorder color="#d7e2a3" />}
                </div>
            ))}
            <div className={styles.played} data-can-activate={(isPlayTurn && !pending) || null}>
                {field.player.map((card, i) => (
                    <div key={i} data-z-plane data-hover-target className={classNames(styles.card, {
                        [styles.empty]: !card,
                    })} onClick={() => hammering && onHammer(i)}>
                        <AnimatePresence initial={false}>
                            {card && (
                                <PlayedCard lane={i} key="player-card">
                                    <CardSprite print={prints[card.print]} state={card.state} onActivate={onActivateLane[i]}/>
                                </PlayedCard>
                            )}
                        </AnimatePresence>
                        {card && hammering && <HoverBorder color="#d7e2a3" />}
                    </div>
                ))}
            </div>
            {needsSac && <div className={styles.sacs}>
                {field.player.map((card, i) => (
                    <div key={i} className={classNames(styles.slot, {
                        [styles.canSac]: laneBloods[i] > 0,
                        [styles.selected]: sacs.includes(i),
                        [styles.empty]: !card,
                    })} onClick={() => toggleSac(i)}>
                        <Sprite className={styles.sac} sheet={Spritesheets.cards} name="sac" />
                    </div>
                ))}
            </div>}
        </div>
        <div data-z-plane className={styles.boardRow}>
            {field.player.map((card, i) => <div key={i} className={styles.cardSlot}>
                <Sprite className={styles.cardSlotBase} sheet={Spritesheets.battle} name="slot" />
                <Sprite className={styles.cardSlotHover} sheet={Spritesheets.battle} name="slotHover" />
            </div>)}
            <div className={styles.played}>
                {field.opposing.map((card, i) => (
                    <div key={i} data-z-plane className={classNames(styles.card, {
                        [styles.empty]: !card,
                    })}>
                        <AnimatePresence initial={false}>
                            {card && (
                                <PlayedCard lane={i} opposing key="opposing-card">
                                    {card && <CardSprite print={prints[card.print]} state={card.state} noCost />}
                                </PlayedCard>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
            {wantsTarget && <div className={styles.targets}>
                {field.player.map((card, i) => (
                    <div key={i} className={styles.slot} onClick={() => onTarget(i)}>
                        <Sprite className={styles.target} sheet={Spritesheets.cards} name="target" />
                    </div>
                ))}
            </div>}
        </div>
    </div>;
});
