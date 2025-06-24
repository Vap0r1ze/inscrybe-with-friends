import styles from './Projectiles.module.css';
import { useAnimate } from 'motion/react';
import { animationDurations, useClientProp } from '@/hooks/useClientStore';
import { useEffect } from 'react';
import { FightSide } from '@/lib/engine/Fight';

export function Projectiles() {
    const [animation] = useClientProp('animating');
    const [scope, animate] = useAnimate<HTMLDivElement>();

    useEffect(() => {
        const el = scope.current;
        if (!el) return;

        const yMap: Record<FightSide, number> = { player: 0, opposing: 1 };

        if (animation?.event.type === 'shoot') {
            const [fromSide, fromLane] = animation.event.from;
            const [toSide, toLane] = animation.event.to;
            const fromY = `${yMap[fromSide] * -64}em`;
            const toY = `${yMap[toSide] * -64}em`;
            const fromX = `${fromLane * 100}%`;
            const toX = `${toLane * 100}%`;

            animate(scope.current, {
                opacity: [0, 1, 1, 1, 1, 1, 0],
                x: [fromX, toX],
                y: [fromY, toY],
            }, { duration: animationDurations.shoot, ease: 'linear' });
        } else {
            el.style.opacity = '0';
        }
    }, [animate, animation, scope]);

    return <div ref={scope} className={styles.slot}>
        <div className={styles.projectile} />
    </div>;
}
