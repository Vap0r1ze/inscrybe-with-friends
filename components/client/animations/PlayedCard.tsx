import { usePresence, useAnimate, AnimationPlaybackControls } from 'framer-motion';
import { animationDurations, useClientProp, useFightGetter } from '@/hooks/useClientStore';
import { ReactNode, useEffect, useRef } from 'react';
import { positions } from '@/lib/engine/utils';
import { FieldPos } from '@/lib/engine/Card';

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
    const lastAnimationRef = useRef<typeof animation>();

    useEffect(() => {
        if (!isPresent && !animation) return safeToRemove?.();
        if (!animation) return void (lastAnimationRef.current = null);

        const el = scope.current;

        const { event } = animation;
        const pos: FieldPos = [opposing ? 'opposing' : 'player', lane];
        const is = (cmpPos: FieldPos) => positions.isSameField(cmpPos, pos);
        // const fight = getFight();
        const yOf = (pos: FieldPos) => pos[0] === 'opposing' ? 0 : 1;
        const zEls = [el, ...getParents(el, '[data-z-plane]')];

        const controls: AnimationPlaybackControls[] = [];
        const cleanup: (() => void)[] = [];

        // Exit animations
        if (!isPresent) {
            if (event.type === 'move') {
                // Move away
                const dx = (event.to[1] - event.from[1]) * 100;
                const dy = (yOf(event.to) - yOf(event.from)) * 100;
                controls.push(animate(el, { x: `${dx}%`, y: `${dy}%` }, { duration: animationDurations.move }));
            } else if (event.type === 'perish' && is(event.pos)) {
                // Die
                controls.push(animate(el, { opacity: 0 }, { duration: animationDurations.perish }));
            } else if (event.type === 'push') { // NOTE: The moving cards should be the only exiting element in the push event
                // Move away
                const dx = event.dx * 100;
                controls.push(animate(el, { x: `${dx}%` }, { duration: animationDurations.push }));
            }
        }

        // Enter animations
        if (isPresent) {
            if (event.type === 'play' && is(event.pos)) {
                // Fade in
                controls.push(animate(el, { opacity: [0, 1] }, { duration: animationDurations.play }));
            } else if (event.type === 'move' && is(event.to) && !event.failed) {
                // Pop in
                el.style.opacity = '0';
                cleanup.push(() => el.style.opacity = '');
            } else if (event.type === 'move' && is(event.from) && event.failed) {
                // Shake
                controls.push(animate(el, {
                    x: ['0%', '10%', '-10%', '0%'],
                }, { duration: animationDurations.move, ease: 'easeInOut' }));
            } else if (event.type === 'attack' && is(event.from)) {
                // Attack
                const dx = (event.to[1] - event.from[1]) * 1;
                const dy = (yOf(event.to) - yOf(event.from)) * 100;
                controls.push(animate(el, {
                    x: ['0', '0', '0', `${dx}em`, '0'],
                    y: ['0%', `${-dy/8}%`, `${-dy/8}%`, `${dy/4}%`, `${dy/4}%`, '0%'],
                }, { duration: animationDurations.attack, ease: 'easeOut' }));
                zEls.forEach(zEl => zEl.style.zIndex = '1');
            } else if (event.type === 'attack' && is(event.to) && !event.direct) {
                // Hit
                const dy = (yOf(event.to) - yOf(event.from)) * 1;
                controls.push(animate(el, {
                    x: ['0%', '10%', '-10%', '0%'],
                    y: ['0%', `${dy}%`, '0%'],
                }, { duration: animationDurations.attack*2/5, delay: animationDurations.attack*3/5, ease: 'easeOut' }));
            } else if (event.type === 'push' && is([event.from[0], event.from[1] + event.dx]) && !event.failed) {
                // Pop in
                el.style.opacity = '0';
                cleanup.push(() => el.style.opacity = '');
            } else if (event.type === 'push' && is(event.from) && event.failed) {
                // Shake
                controls.push(animate(el, {
                    x: ['0%', '10%', '-10%', '0%'],
                }, { duration: animationDurations.push, ease: 'easeInOut' }));
            }
        }

        return () => {
            controls.forEach(c => c.complete());
            cleanup.forEach(c => c());
            zEls.forEach(zEl => zEl.style.zIndex = '');
            if (lastAnimationRef.current !== animation) safeToRemove?.();
            lastAnimationRef.current = animation;
        };
    }, [isPresent, animation, safeToRemove, animate, scope, lane, opposing, getFight]);

    return <div ref={scope}>{children}</div>;
}
