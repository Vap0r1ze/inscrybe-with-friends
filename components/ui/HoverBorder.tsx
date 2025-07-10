import { getComputedColor } from '@/lib/utils';
import styles from './HoverBorder.module.css';
import { memo, useCallback, useEffect, useRef } from 'react';
import { triggerSound } from '@/hooks/useAudio';
import classNames from 'classnames';
import { useElementSize } from '@mantine/hooks';

const FPS = 10;

export interface HoverBorderProps {
    color?: string;
    lineDash?: number[];
    lineWidth?: number;
    inset?: number;
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    alwaysPlay?: boolean;
}
export const HoverBorder = memo(function HoverBorder({
    color = '--flow',
    lineDash = [3, 2],
    lineWidth = 1,
    top, left, right, bottom, inset,
    alwaysPlay,
}: HoverBorderProps) {
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const hoveredRef = useRef(true);
    const requestRef = useRef<number>(undefined);
    const previousTimeRef = useRef<number>(undefined);
    const frameRef = useRef(0);
    const stepRef = useRef(0);
    const animationLength = lineDash.reduce((a, b) => a + b, 0);

    const cssColor = color.startsWith('--') ? `var(${color})` : color;

    top ??= inset ?? 0;
    right ??= inset ?? 0;
    bottom ??= inset ?? 0;
    left ??= inset ?? 0;

    const getPaused = useCallback(() => {
        if (alwaysPlay) return false;
        return !hoveredRef.current;
    }, [alwaysPlay]);

    const { ref: canvasRef, width, height } = useElementSize();

    useEffect(() => {
        if (!canvasRef.current) return;
        const scale = parseFloat(getComputedStyle(canvasRef.current, null).getPropertyValue('font-size')) / 2;
        canvasRef.current.width = width / scale;
        canvasRef.current.height = height / scale;
    }, [width, height, canvasRef]);

    const canvasCallback = (canvas: HTMLCanvasElement) => {
        ctxRef.current = canvas.getContext('2d');
        canvasRef.current = canvas;

        return () => {
            canvasRef.current = null;
            ctxRef.current = null;
        };
    };

    const draw = useCallback(() => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        const { width, height } = ctx.canvas;
        const computedColor = getComputedColor(ctx.canvas, cssColor);

        stepRef.current++;
        stepRef.current %= animationLength;
        ctx.clearRect(0, 0, width, height);
        ctx.setLineDash(lineDash);
        ctx.lineWidth = lineWidth * 2;
        ctx.strokeStyle = computedColor;
        ctx.lineDashOffset = animationLength - stepRef.current - 1;
        ctx.strokeRect(0, 0, width, height);
    }, [cssColor, animationLength, lineDash, lineWidth]);

    const animate: FrameRequestCallback = useCallback(time => {
        const newFrame = Math.floor(time / 1e3 * FPS) % FPS;
        if (newFrame !== frameRef.current) {
            frameRef.current = newFrame;
            if (!getPaused()) draw();
        };
        requestRef.current = requestAnimationFrame(animate);
        previousTimeRef.current = time;
    }, [draw, getPaused]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [animate]);

    const onMouseEnter = useCallback(({ target }: Event) => {
        if (!(target instanceof HTMLElement)) return;
        if (target.matches('[data-hover-blip]')) triggerSound('blip');
        hoveredRef.current = true;
    }, []);
    const onMouseLeave = useCallback(({ target }: Event) => {
        if (!(target instanceof HTMLElement)) return;
        hoveredRef.current = false;
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

    return <canvas className={classNames(styles.hover, {
        [styles.hoverControls]: !alwaysPlay,
    })} ref={canvasCallback} style={{
        top: `${top}em`,
        left: `${left}em`,
        width: `calc(100% - ${left + right}em)`,
        height: `calc(100% - ${top + bottom}em)`,
    }} />;
});
