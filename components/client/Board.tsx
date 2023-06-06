import styles from './Board.module.css';
import { Spritesheets } from '@/lib/spritesheets';
import { Sprite } from '../sprites/Sprite';
import classNames from 'classnames';
import { useClientActions, useClientProp, useFight, useHolding } from '@/hooks/useClientStore';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { HoverBorder } from '../ui/HoverBorder';
import { CardSprite } from '../sprites/CardSprite';
import { prints } from '@/lib/defs/prints';
import { useSet } from '@/hooks/useSet';
import { FieldPos, getBloods, getRoomOnSac } from '@/lib/engine/Card';
import { PlayedCard } from './animations/PlayedCard';
import { AnimatePresence } from 'framer-motion';
import { FIGHT_SIDES } from '@/lib/engine/Fight';
import { fromEntries } from '@/lib/utils';
import { NSlice } from '../ui/NSlice';
import { useBattleTheme } from '@/hooks/useBattleTheme';
import Asset from '../sprites/Asset';

export const Board = memo(function Board() {
    const battleTheme = useBattleTheme();
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
    let canPlay = !!(isPlayTurn && !pending && holding);
    if (holdingPrint?.cost?.type === 'blood' && holdingIdx !== mustPlay) {
        canPlay = false;
    }

    const laneBloods = field.player.map((card) => getBloods(prints, [card]));
    const laneCanSac = field.player.map((card, i) => {
        if (!card) return false;
        if (laneBloods[i] <= 0) return false;
        if (sacs.includes(i)) return true;
        if (getRoomOnSac(field.player, [card, ...sacs.map(i => field.player[i])]) < 1) return false;
        return true;
    });

    let needsSac = false;
    if (holdingPrint?.cost?.type === 'blood') needsSac = laneBloods.reduce((a, b) => a + b) >= holdingPrint.cost.amount;
    if (mustPlay != null) needsSac = false;

    const onTryPlay = useCallback((lane: number) => {
        if (holdingIdx == null || pending || !canPlay) return;
        sendAction('play', { lane, card: holdingIdx, sacs });
        clearSacs();
        setHolding(null);
        setHammering(false);
    }, [clearSacs, holdingIdx, pending, sacs, sendAction, setHolding, setHammering, canPlay]);
    const onTrySac = useCallback((lane: number) => {
        if (holdingIdx == null || pending) return;
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
                onTrySac(holdingIdx!);
            };
        }
    }, [field.player, holdingIdx, sacs, onTrySac, holdingPrint?.cost]);

    useEffect(() => {
        clearSacs();
    }, [holding, clearSacs]);

    const fieldPos = useMemo(() => {
        return fromEntries(FIGHT_SIDES.map(side => [side, field[side].map((card, i) => [side, i] as FieldPos)]));
    }, [field.player.length]); // eslint-disable-line react-hooks/exhaustive-deps

    return <div className={styles.board}>
        <Sprite className={styles.boardBg} sheet={battleTheme} name="board" />
        <NSlice
            className={styles.border}
            sheet={battleTheme}
            name="boardBorder"
            rows={[4, 0, 4, 60]}
            cols={[4, 0, 4]}
        />
        <div data-z-plane className={classNames(styles.boardRow, styles.playerRow)}>
            {field.player.map((card, i) => (
                <div key={i} data-hover-target className={styles.cardSlot} onClick={() => onTryPlay(i)}>
                    <Sprite className={styles.cardSlotBase} sheet={battleTheme} name="slot" />
                    <Sprite className={styles.cardSlotHover} sheet={battleTheme} name="slotHover" />
                    {canPlay && <HoverBorder color="#d7e2a3" />}
                </div>
            ))}
            <div className={styles.played} data-can-activate={(isPlayTurn && !pending) || null}>
                {field.player.map((card, i) => (
                    <div key={i} data-z-plane data-hover-target className={classNames(styles.card, {
                        [styles.empty]: !card,
                    })} onClick={() => hammering && onHammer(i)}>
                        <AnimatePresence initial={false}>
                            {card && (
                                <PlayedCard lane={i} key="player">
                                    <CardSprite
                                        print={prints[card.print]}
                                        state={card.state}
                                        onActivate={onActivateLane[i]}
                                        fieldPos={fieldPos.player[i]}/>
                                </PlayedCard>
                            )}
                        </AnimatePresence>
                        {card && hammering && <HoverBorder color="#d7e2a3" />}
                    </div>
                ))}
            </div>
            {needsSac && <div className={styles.sacs}>
                {field.player.map((card, i) => (
                    <div
                        key={i}
                        data-hover-target
                        className={classNames(styles.slot, {
                            [styles.canSac]: laneCanSac[i],
                            [styles.selected]: sacs.includes(i),
                            [styles.empty]: !card,
                        })}
                        onClick={() => toggleSac(i)}
                    >
                        <Sprite className={styles.sac} sheet={Spritesheets.cards} name="sac" />
                        {laneCanSac[i] && <HoverBorder color="#d7e2a3" />}
                    </div>
                ))}
            </div>}
        </div>
        <div data-z-plane className={styles.boardRow}>
            {field.player.map((card, i) => <div key={i} className={styles.cardSlot}>
                <Sprite className={styles.cardSlotBase} sheet={battleTheme} name="slot" />
                <Sprite className={styles.cardSlotHover} sheet={battleTheme} name="slotHover" />
            </div>)}
            <div className={styles.played}>
                {field.opposing.map((card, i) => (
                    <div key={i} data-z-plane className={classNames(styles.card, {
                        [styles.empty]: !card,
                    })}>
                        <AnimatePresence initial={false}>
                            {card && (
                                <PlayedCard lane={i} opposing key="opposing">
                                    {card && <CardSprite
                                        print={prints[card.print]}
                                        state={card.state}
                                        noCost
                                        fieldPos={fieldPos.opposing[i]}
                                    />}
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
