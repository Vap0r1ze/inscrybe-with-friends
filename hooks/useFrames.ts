import { useEffect, useState } from 'react';

export function useFrame(fps: number) {
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setFrame(time => time + 1);
            if (frame >= fps) setFrame(0);
        }, 1e3 / fps);
        return () => clearInterval(interval);
    });

    return frame;
}
