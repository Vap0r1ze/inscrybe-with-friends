import styles from './Card.module.css';
import { CardPrint, CardState } from '@/lib/engine/Card';
import CostSprite from './CostSprite';
import Asset from './Asset';
import StatSprite from './StatSprite';
import { useState } from 'react';
import classNames from 'classnames';
import Sprite from './Sprite';
import { Spritesheets } from '@/lib/spritesheets';

export function CardSprite({ print, state }: { print: CardPrint, state?: CardState }) {
    const portrait = print.portrait ?? 'empty';
    const face = print.face ?? 'common';

    let back = 'common_back';
    if ((print.sigils ?? state?.sigils)?.includes('waterborne')) back = 'submerged_back';

    return <div className={styles.card}>
        <div className={classNames({
            [styles.cardContent]: true,
            [styles.flipped]: !!state?.flipped,
        })}>
            <div className={styles.cardFront}>
                <div className={styles.cardFace}>
                    <Sprite sheet={Spritesheets.cards} name={face} />
                </div>
                <div className={styles.cardPortrait}>
                    <Sprite sheet={Spritesheets.portraits} name={portrait} />
                </div>
                {print.frame && <div className={styles.cardFace}>
                    <Sprite sheet={Spritesheets.cards} name={print.frame} />
                </div>}
                {print.fused && <div className={styles.cardFace}>
                    <Sprite sheet={Spritesheets.cards} name="stitches" />
                </div>}
                <div className={styles.cardSigils}>
                    {print.sigils?.map(sigil => <div key={sigil} className={styles.cardSigil} style={{
                        marginLeft: `${(print.sigils!.length % 2) ? 0 : 1}em`,
                    }}>
                        <Sprite sheet={sigil.startsWith('activated') ? Spritesheets.buttonSigils : Spritesheets.sigils} name={sigil} />
                    </div>)}
                </div>
                {print.cost && <div className={styles.cardCost}>
                    <CostSprite cost={print.cost} />
                </div>}
                <div className={styles.cardStats}>
                    <StatSprite stat={print.power} />
                    <StatSprite stat={print.health} />
                </div>
            </div>
            <div className={styles.cardBack}>
                <Sprite sheet={Spritesheets.cards} name={back} />
            </div>
        </div>
    </div>;
}
