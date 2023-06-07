import { isClient } from '@/utils/next';
import styles from './HoverBorder.module.css';
import { memo, useCallback, useEffect, useRef } from 'react';
import { triggerSound } from '@/hooks/useAudio';

const FPS = 10;

export interface HoverBorderProps {
    color?: string;
    inset?: number;
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
}
export const HoverBorder = memo(function HoverBorder({ color = '--flow', top, left, right, bottom, inset }: HoverBorderProps) {
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const pausedRef = useRef(true);
    const requestRef = useRef<number>();
    const previousTimeRef = useRef<number>();
    const frameRef = useRef(0);
    const stepRef = useRef(0);

    top ??= inset ?? 0;
    right ??= inset ?? 0;
    bottom ??= inset ?? 0;
    left ??= inset ?? 0;

    const observerRef = useRef(isClient ? new ResizeObserver((entries) => {
        for (const { target } of entries) {
            if (!(target instanceof HTMLCanvasElement)) continue;
            const scale = parseFloat(getComputedStyle(target, null).getPropertyValue('font-size')) / 2;
            target.width = target.clientWidth / scale;
            target.height = target.clientHeight / scale;
        }
    }) : null);

    const canvasCallback = (canvas: HTMLCanvasElement | null) => {
        if (!canvas) {
            ctxRef.current = null;
            return observerRef.current?.disconnect();
        }
        observerRef.current?.observe(canvas);
        ctxRef.current = canvas.getContext('2d');
    };

    const draw = useCallback(() => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        const { width, height } = ctx.canvas;
        const computedColor = color.startsWith('--')
            ? getComputedStyle(ctx.canvas).getPropertyValue(color)
            : color;
        stepRef.current++;
        stepRef.current %= 5;
        ctx.clearRect(0, 0, width, height);
        ctx.setLineDash([3, 2]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = computedColor;
        ctx.lineDashOffset = 4 - stepRef.current;
        ctx.strokeRect(0, 0, width, height);
    }, [color]);

    const animate: FrameRequestCallback = useCallback(time => {
        const newFrame = Math.floor(time / 1e3 * FPS) % FPS;
        if (newFrame !== frameRef.current) {
            frameRef.current = newFrame;
            if (!pausedRef.current) draw();
        };
        requestRef.current = requestAnimationFrame(animate);
        previousTimeRef.current = time;
    }, [draw]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [animate]);

    const onMouseEnter = useCallback(({ target }: Event) => {
        if (!(target instanceof HTMLElement)) return;
        if (target.matches('[data-hover-blip]')) triggerSound('blip');
        pausedRef.current = false;
    }, []);
    const onMouseLeave = useCallback(({ target }: Event) => {
        if (!(target instanceof HTMLElement)) return;
        pausedRef.current = true;
    }, []);

    useEffect(() => {
        const parent = ctxRef.current?.canvas.closest('[data-hover-target]');
        if (!parent) return;
        parent.addEventListener('mouseenter', onMouseEnter);
        parent.addEventListener('mouseleave', onMouseLeave);
        () => {
            parent.removeEventListener('mouseenter', onMouseEnter);
            parent.removeEventListener('mouseleave', onMouseLeave);
        };
    }, [onMouseEnter, onMouseLeave]);

    return <canvas className={styles.hover} ref={canvasCallback} style={{
        top: `${top}em`,
        left: `${left}em`,
        width: `calc(100% - ${left + right}em)`,
        height: `calc(100% - ${top + bottom}em)`,
    }} />;
});
