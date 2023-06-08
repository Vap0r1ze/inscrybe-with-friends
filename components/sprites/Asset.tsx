import { useEffect, useState } from 'react';

export interface AssetProps {
    path: string;
}
export function Asset({ path }: AssetProps) {
    const [size, setSize] = useState<{ width: number, height: number }>();

    useEffect(() => {
        const signal = new AbortController();
        const img = new Image();
        img.onload = () => {
            img.onload = null;
            setSize({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.src = path;
        return () => signal.abort();
    }, [path]);

    if (!size) return null;

    return <div style={{
        backgroundImage: `url(${path})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${size.width}em ${size.height}em`,
        imageRendering: 'pixelated',
        width: `${size.width}em`,
        height: `${size.height}em`,
    }} />;
}
