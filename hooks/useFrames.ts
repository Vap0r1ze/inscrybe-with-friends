import { useEffect, useRef, useState } from 'react';

export function useFrame(fps: number) {
    const [frame, setFrame] = useState(0);
    const requestRef = useRef<number>();
    const previousTimeRef = useRef<number>();

    const animate: FrameRequestCallback = time => {
        const newFrame = Math.floor(time / 1e3 * fps) % fps;
        if (newFrame !== frame) setFrame(newFrame);
        requestRef.current = requestAnimationFrame(animate);
        previousTimeRef.current = time;
    };


    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    });

    return frame;
}
