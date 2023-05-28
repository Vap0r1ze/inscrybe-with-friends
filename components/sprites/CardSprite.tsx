import styles from './Card.module.css';
import { CardPrint, CardState } from '@/lib/engine/Card';
import CostSprite from './CostSprite';
import Asset from './Asset';
import StatSprite from './StatSprite';
import { useState } from 'react';
import classNames from 'classnames';
import Sprite from './Sprite';
import { Spritesheets } from '@/lib/spritesheets';
import { sigils } from '@/lib/defs/sigils';
import { openInRulebook } from '@/hooks/useRulebook';

export function CardSprite({ print, state }: { print: CardPrint, state?: CardState }) {
    const portrait = print.portrait ?? 'empty';
    const face = print.face ?? 'common';

    let back = 'common_back';
    if ((print.sigils ?? state?.sigils)?.includes('waterborne')) back = 'submerged_back';

    return <div className={styles.card} onContextMenu={e => e.preventDefault()}>
        <div className={classNames({
            [styles.content]: true,
            [styles.flipped]: !!state?.flipped,
        })}>
            <div className={styles.front}>
                <div className={styles.face}>
                    <Sprite sheet={Spritesheets.cards} name={face} />
                </div>
                <div className={styles.portrait}>
                    <Sprite sheet={Spritesheets.portraits} name={portrait} />
                </div>
                {print.frame && <div className={styles.face}>
                    <Sprite sheet={Spritesheets.cards} name={print.frame} />
                </div>}
                {print.fused && <div className={styles.face}>
                    <Sprite sheet={Spritesheets.cards} name="stitches" />
                </div>}
                {print.noSac && <div className={styles.noSac}>
                    <Asset path="/assets/no-sac.png" />
                </div>}
                <div className={styles.sigils}>
                    {/* TODO: Open rulebook modal on rightclick */}
                    {print.sigils?.map((sigil, i) => <div key={i} className={styles.sigil} style={{
                        marginLeft: `${(print.sigils!.length % 2) ? 0 : 1}em`,
                    }} onContextMenu={() => openInRulebook(sigils[sigil].name)}>
                        <Sprite sheet={sigil.startsWith('activated') ? Spritesheets.buttonSigils : Spritesheets.sigils} name={sigil} />
                    </div>)}
                </div>
                {print.cost && <div className={styles.cost}>
                    <CostSprite cost={print.cost} />
                </div>}
                <div className={styles.stats}>
                    <StatSprite stat={print.power} />
                    <StatSprite stat={print.health} />
                </div>
            </div>
            <div className={styles.back}>
                <Sprite sheet={Spritesheets.cards} name={back} />
            </div>
        </div>
    </div>;
}
