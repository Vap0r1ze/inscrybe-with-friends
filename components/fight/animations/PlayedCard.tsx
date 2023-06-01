import styles from './PlayedCard.module.css';
import { usePresence, useAnimate, AnimationPlaybackControls } from 'framer-motion';
import { animationDurations, useClientProp, useClientStore, useFightGetter } from '@/hooks/useClientStore';
import { ReactNode, useEffect } from 'react';
import { getTargets } from '@/lib/engine/Effects';
import { positions } from '@/lib/engine/utils';
import { CardPos, FieldPos } from '@/lib/engine/Card';

const getParents = (el: HTMLElement, selector?: string) => {
    const parents: HTMLElement[] = [];
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        if (!selector || parent.matches(selector)) parents.push(parent);
    }
    return parents;
};

export interface PlayedCardProps {
    opposing?: boolean
    children?: ReactNode
    lane: number
}
export function PlayedCard({ children, opposing, lane }: PlayedCardProps) {
    const [animation] = useClientProp('animating');
    const [isPresent, safeToRemove] = usePresence();
    const [scope, animate] = useAnimate<HTMLDivElement>();
    const getFight = useFightGetter();

    useEffect(() => {
        if (!isPresent && !animation) return safeToRemove();
        if (!animation) return;

        const el = scope.current;

        const { event } = animation;
        const pos: FieldPos = [opposing ? 'opposing' : 'player', lane];
        const is = (cmpPos: FieldPos) => positions.isSameField(cmpPos, pos);
        const fight = getFight();
        const yOf = (pos: FieldPos) => pos[0] === 'opposing' ? 0 : 1;
        const zEls = [el, ...getParents(el, '[data-z-plane]')];

        const controls: AnimationPlaybackControls[] = [];
        const cleanup: (() => void)[] = [];

        // Exit animations
        if (!isPresent) {
            if (event.type === 'move' && is(event.from)) {
                const dx = event.to[1] - event.from[1];
                const dy = yOf(event.to) - yOf(event.from);
                controls.push(animate(el, { x: `${dx}00%`, y: `${dy}00%` }, { duration: animationDurations.move }));
            } else if (event.type === 'perish' && is(event.pos)) {
                controls.push(animate(el, { opacity: 0 }, { duration: animationDurations.perish }));
            }
        }

        // Enter animations
        if (isPresent) {
            if (event.type === 'play' && is(event.pos)) {
                el.style.opacity = '0';
                controls.push(animate(el, { opacity: 1 }, { duration: animationDurations.play }));
            } else if (event.type === 'move' && is(event.to) && !fight.field[event.from[0]][event.from[1]]) {
                el.style.opacity = '0';
                cleanup.push(() => el.style.opacity = '');
            } else if (event.type === 'attack' && is(event.from)) {
                const dx = (event.to[1] - event.from[1]) / 2 * 100;
                const dy = (yOf(event.to) - yOf(event.from)) / 2 * 100;
                controls.push(animate(el, {
                    scale: [1, 1.1, 1],
                    x: ['0%', `${dx}%`, '0%'],
                    y: ['0%', `${dy}%`, '0%'],
                }, { duration: animationDurations.attack, ease: 'easeInOut' }));
                zEls.forEach(zEl => zEl.style.zIndex = '1');
            } else if (event.type === 'attack' && is(event.to) && !event.direct) {
                const dy = (yOf(event.to) - yOf(event.from)) * 3;
                controls.push(animate(el, {
                    x: ['0%', '10%', '-10%', '0%'],
                    y: ['0%', `${dy}%`, '0%'],
                }, { duration: animationDurations.attack, ease: 'easeInOut' }));
            }
        }

        return () => {
            controls.forEach(c => c.complete());
            cleanup.forEach(c => c());
            zEls.forEach(zEl => zEl.style.zIndex = '');
        };
    }, [isPresent, animation, safeToRemove, animate, scope, lane, opposing, getFight]);

    return <div ref={scope}>{children}</div>;
}
