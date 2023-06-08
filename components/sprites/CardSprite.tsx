import styles from './Card.module.css';
import classNames from 'classnames';
import { memo } from 'react';
import { CardPrint, CardState, CircuitSlot, FieldPos, getCardPower, getCircuit } from '@/lib/engine/Card';
import { CostSprite } from './CostSprite';
import { Asset } from './Asset';
import { StatSprite } from './StatSprite';
import { Sprite } from './Sprite';
import { Spritesheets } from '@/lib/spritesheets';
import { Sigil } from '@/lib/defs/sigils';
import { openInRulebook } from '@/hooks/useRulebook';
import { SigilButton } from '../inputs/SigilButton';
import { useClient } from '@/hooks/useClientStore';
import { rulesets } from '@/lib/defs/prints';

const horizonalSigils: Sigil[] = [
    'squirrelStrafe',
    'strafe',
    'strafePush',
];
const verticalSigils: Sigil[] = [
    'detonator',
];
const waterborneSigils: Sigil[] = [
    'waterborne',
    'waterborneTentacle',
];

export interface CardSpriteProps {
    print: CardPrint;
    state?: CardState;
    noCost?: boolean;
    className?: string;
    fieldPos?: FieldPos;
    onActivate?: (sigil: Sigil) => void;
}
export const CardSprite = memo(function CardSprite({
    className,
    print,
    state,
    noCost,
    fieldPos,
    onActivate,
}: CardSpriteProps) {
    const client = useClient();
    const portrait = print.portrait ?? 'empty';
    const face = print.face ?? 'common';

    let back = 'common_back';
    if ((state?.sigils ?? print.sigils)?.some(sigil => waterborneSigils.includes(sigil))) back = 'submerged_back';

    const isOpposing = fieldPos?.[0] === 'opposing';
    const health = state?.health ?? print.health;
    let power = state?.power ?? print.power;
    const staticPower = power;
    const isDynamicPower = typeof staticPower !== 'number';

    let circuitSlot: CircuitSlot = null;
    if (fieldPos && client) {
        const { prints } = rulesets[client.fight.opts.ruleset];
        const calcPower = getCardPower(prints, client.fight, fieldPos);
        if (calcPower != null) power = calcPower;

        const circuit = getCircuit(prints, client.fight.field[fieldPos[0]]);
        circuitSlot = circuit[fieldPos[1]];
    }

    const onPowerContextMenu = () => {
        if (isDynamicPower) openInRulebook(`stat:${staticPower}`);
    };

    return <div className={classNames(styles.card, className)} onContextMenu={e => e.preventDefault()}>
        <div className={classNames({
            [styles.content]: true,
            [styles.flipped]: state?.flipped,
        })}>
            <div className={styles.front}>
                <div className={styles.face}>
                    <Sprite sheet={Spritesheets.cards} name={face} />
                </div>
                <div className={styles.portrait} onContextMenu={() => openInRulebook(`print:${portrait}`)}>
                    <Sprite sheet={Spritesheets.portraits} name={portrait} />
                </div>
                {print.frame && <div className={styles.face}>
                    <Sprite sheet={Spritesheets.cards} name={print.frame} />
                </div>}
                {print.fused && <div className={styles.face}>
                    <Sprite sheet={Spritesheets.cards} name="stitches" />
                </div>}
                {print.conduit && <div className={styles.face}>
                    <Sprite sheet={Spritesheets.cards} name="conduit" />
                </div>}
                {print.conduit && (circuitSlot === 'right' || circuitSlot === 'circuit') && <div className={styles.face}>
                    <Sprite sheet={Spritesheets.cards} name="conduitLeft" />
                </div>}
                {print.conduit && (circuitSlot === 'left' || circuitSlot === 'circuit') && <div className={styles.face}>
                    <Sprite sheet={Spritesheets.cards} name="conduitRight" />
                </div>}
                {print.noSac && <div className={styles.noSac}>
                    <Asset path="/assets/no-sac.png" />
                </div>}
                <div className={styles.sigils}>
                    {print.sigils?.map((sigil, i) => <div key={i} className={classNames(styles.sigil, {
                        [styles.backward]: state?.backward && horizonalSigils.includes(sigil),
                        [styles.upsideDown]: isOpposing && verticalSigils.includes(sigil),
                    })} style={{
                        marginLeft: `${(print.sigils!.length % 2) ? 0 : 1}em`,
                    }} onContextMenu={() => openInRulebook(`sigil:${sigil}`)}>
                        {sigil.startsWith('activated')
                            ? <SigilButton sigil={sigil} onClick={() => onActivate?.(sigil)} />
                            : <Sprite sheet={Spritesheets.sigils} name={sigil} />}
                    </div>)}
                </div>
                {!noCost && print.cost && <div className={styles.cost}>
                    <CostSprite cost={print.cost} />
                </div>}
                <div className={styles.stats}>
                    <StatSprite className={classNames(styles.stat, {
                        [styles.dynamicStat]: power !== staticPower,
                        [styles.isDynamicStat]: isDynamicPower,
                    })} stat={power} onContextMenu={onPowerContextMenu} />
                    <StatSprite className={classNames(styles.stat, {
                        [styles.warningStat]: health < print.health,
                    })} stat={health} />
                </div>
            </div>
            <div className={styles.back}>
                <Sprite sheet={Spritesheets.cards} name={back} />
            </div>
        </div>
    </div>;
});
