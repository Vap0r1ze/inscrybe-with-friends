import styles from './Card.module.css';
import { Assets } from '@/lib/constants';
import { Card } from '@/lib/game/Card';
import CostSprite from './CostSprite';
import Asset from './Asset';
import StatSprite from './StatSprite';
import { useState } from 'react';
import classNames from 'classnames';

const faces = {
    common: Assets.CardFace,
    rare: Assets.CardFaceRare,
};
const frames = {
    nature: Assets.RareFrameNature,
    undead: Assets.RareFrameUndead,
    tech: Assets.RareFrameTech,
    wizard: Assets.RareFrameWizard,
};
const backs = {
    common: Assets.CardBack,
    submerged: Assets.CardBackSubmerged,
};

export function CardSprite({ card }: { card: Card }) {
    const [flipped, setFlipped] = useState(false);

    const portrait = Assets.portrait(card.portrait ?? 'empty');
    const face = faces[card.face ?? 'common'];
    const back = backs[card.back ?? 'common'];
    const frame = card.frame ? frames[card.frame] : null;

    return <div className={styles.card} onClick={() => setFlipped(f => !f)}>
        <div className={classNames({
            [styles.cardContent]: true,
            [styles.flipped]: flipped,
        })}>
            <div className={styles.cardFront}>
                <div className={styles.cardFace}>
                    <Asset path={face} />
                </div>
                <div className={styles.cardPortrait}>
                    <Asset path={portrait} />
                </div>
                {frame && <div className={styles.cardFrame}>
                    <Asset path={frame} />
                </div>}
                <div className={styles.cardSigils}>
                    {card.sigils?.map(sigil => <div key={sigil} className={styles.cardSigil}>
                        <Asset path={Assets.sigil(sigil)} />
                    </div>)}
                </div>
                {card.cost && <div className={styles.cardCost}>
                    <CostSprite cost={card.cost} />
                </div>}
                <div className={styles.cardStats}>
                    <StatSprite stat={card.power} />
                    <StatSprite stat={card.health} />
                </div>
            </div>
            <div className={styles.cardBack}>
                <Asset path={back} />
            </div>
        </div>
    </div>;
}
