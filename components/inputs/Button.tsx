import { useFrame } from '@/hooks/useFrames';
import styles from './Button.module.css';
import { ReactNode, useEffect, useRef } from 'react';

const FPS = 10;
export interface ButtonProps {
    children?: ReactNode;
    onClick?: () => void;
}
export function Button({ children, onClick }: ButtonProps) {
    const pausedRef = useRef(false);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const requestRef = useRef<number>();
    const previousTimeRef = useRef<number>();
    const frameRef = useRef(0);
    const stepRef = useRef(0);

    const canvasRef = (canvas: HTMLCanvasElement | null) => {
        if (!canvas) return;
        const scale = parseFloat(getComputedStyle(canvas, null).getPropertyValue('font-size'));
        canvas.width = canvas.clientWidth / scale;
        canvas.height = canvas.clientHeight / scale;
        ctxRef.current = canvas.getContext('2d') ?? null;
    };

    const draw = () => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        const { width, height } = ctx.canvas;
        stepRef.current++;
        stepRef.current %= 5;
        ctx.clearRect(0, 0, width, height);
        ctx.setLineDash([3, 2]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#020a11';
        ctx.lineDashOffset = 4 - stepRef.current;
        ctx.strokeRect(0, 0, width, height);
    };

    const animate: FrameRequestCallback = time => {
        const newFrame = Math.floor(time / 1e3 * FPS) % FPS;
        if (newFrame !== frameRef.current) {
            frameRef.current = newFrame;
            if (!pausedRef.current) draw();
        };
        requestRef.current = requestAnimationFrame(animate);
        previousTimeRef.current = time;
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    });

    return <button
        className={styles.button}
        onClick={onClick}
        onMouseEnter={() => pausedRef.current = false}
        onMouseLeave={() => pausedRef.current = true}
    >
        <div>{children}</div>
        <canvas className={styles.hover} ref={canvasRef} />
    </button>;
}
