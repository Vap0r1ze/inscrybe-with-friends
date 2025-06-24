import styles from './Board.module.css';
import { Spritesheets } from '@/lib/spritesheets';
import { Sprite } from '../sprites/Sprite';
import classNames from 'classnames';
import { useClientActions, useClientProp, useFight, useHolding } from '@/hooks/useClientStore';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { HoverBorder } from '../ui/HoverBorder';
import { CardSprite } from '../sprites/CardSprite';
import { rulesets } from '@/lib/defs/prints';
import { useSet } from '@/hooks/useSet';
import { FieldPos, getBloods, getCircuit, getRoomOnSac } from '@/lib/engine/Card';
import { PlayedCard } from './animations/PlayedCard';
import { AnimatePresence } from 'motion/react';
import { FIGHT_SIDES } from '@/lib/engine/Fight';
import { entries, fromEntries } from '@/lib/utils';
import { NSlice } from '../ui/NSlice';
import { useBattleSheet } from '@/hooks/useBattleTheme';
import { Projectiles } from './animations/Projectiles';
import { triggerSound } from '@/hooks/useAudio';

export const Board = memo(function Board() {
    const battleTheme = useBattleSheet();
    const prints = useFight(fight => rulesets[fight.opts.ruleset].prints);
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
        sendAction('activate', { lane, sigil }, {
            InsufficientResources: () => triggerSound('error'),
        });
        setHolding(null);
        setHammering(false);
    }, [pending, sendAction, setHolding, setHammering]);

    const onActivateLane = useMemo(() => {
        return Array.from({ length: field.player.length }, (card, i) => (sigil: string) => onActivate(i, sigil));
    }, [field.player.length, onActivate]);

    useEffect(() => {
        if (holdingPrint?.cost?.type === 'blood') {
            const bloods = getBloods(prints, sacs.map(i => field.player[i]));
            if (bloods >= holdingPrint.cost.amount) {
                onTrySac(holdingIdx!);
            };
        }
    }, [field.player, holdingIdx, sacs, onTrySac, holdingPrint?.cost, prints]);

    useEffect(() => {
        clearSacs();
    }, [holding, clearSacs]);

    const fieldPos = useMemo(() => {
        return fromEntries(FIGHT_SIDES.map(side => [side, field[side].map((card, i) => [side, i] as FieldPos)]));
    }, [field.player.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const circuits = useMemo(() => {
        return fromEntries(entries(field).map(([side, cards]) => [side, getCircuit(prints, cards)]));
    }, [prints, field]);

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
                    {canPlay && <HoverBorder color="--ui" />}
                </div>
            ))}
            <div className={styles.played} data-can-activate={(isPlayTurn && !pending) || null}>
                {field.player.map((card, i) => (
                    <div key={i} data-z-plane data-hover-target className={classNames(styles.card, {
                        [styles.empty]: !card,
                    })} onClick={() => hammering && onHammer(i)}>
                        {circuits.player[i] === 'circuit' && (
                            <Sprite className={styles.circuit} sheet={Spritesheets.cards} name="circuit" />
                        )}
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
                        {card && hammering && <HoverBorder color={circuits.player[i] === 'circuit' ? '--flow' : '--ui'} />}
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
                        {laneCanSac[i] && <HoverBorder color="--ui" />}
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
                        {circuits.opposing[i] === 'circuit' && (
                            <Sprite className={styles.circuit} sheet={Spritesheets.cards} name="circuit" />
                        )}
                    </div>
                ))}
            </div>
            {wantsTarget && <div className={styles.targets}>
                {field.player.map((card, i) => (
                    <div key={i} className={styles.slot} onClick={() => onTarget(i)}>
                        <Sprite className={styles.target} sheet={Spritesheets.cards} name="target" />
                        <Sprite className={styles.targetHover} sheet={Spritesheets.cards} name="targetHover" />
                    </div>
                ))}
            </div>}
        </div>
        <Projectiles />
    </div>;
});
