import { useAwaiter } from '@/hooks/useAsync';
import { Spritesheet } from '@/lib/spritesheets';

export interface NSliceProps {
    sheet: Spritesheet;
    name: string;
    rows: number[];
    cols: number[];
    className?: string;
}

const cache = new Map<string, Record<string, string>>();

export function NSlice({
    sheet,
    name,
    rows,
    cols,
    className,
}: NSliceProps) {
    const [spriteX, spriteY, spriteW, spriteH] = sheet.sprites[name];
    const [tileW, tileH] = [spriteW / cols.length, spriteH / rows.length];

    const cachedImages = cache.get(`${sheet.path}:${name}`);

    const [computedImages, pending, error] = useAwaiter(async () => {
        if (cachedImages) return null;
        const img = new Image();
        img.src = sheet.path;
        await img.decode();

        const canvas = document.createElement('canvas');
        canvas.width = tileW;
        canvas.height = tileH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        const images: Record<string, string> = {};

        for (let i = 0; i < rows.length; i++) for (let j = 0; j < cols.length; j++) {
            const x = spriteX + j * tileW;
            const y = spriteY + i * tileH;
            ctx.clearRect(0, 0, tileW, tileH);
            ctx.drawImage(img, -x, -y);
            const url = canvas.toDataURL();
            images[`${i}:${j}`] = url;
        }

        return images;
    }, []);

    if (computedImages) cache.set(`${sheet.path}:${name}`, computedImages);
    const images = computedImages ?? cachedImages;

    return <div className={className} style={{
        display: 'grid',
        gridTemplateColumns: cols.map(w => w ? `${w}em` : 'auto').join(' '),
        gridTemplateRows: rows.map(h => h ? `${h}em` : 'auto').join(' '),
    }}>
        {rows.map((row, i) =>
            cols.map((col, j) => <div key={`${i}:${j}`} style={{
                backgroundImage: images ? `url(${images[`${i}:${j}`]})` : undefined,
                backgroundPosition: `-${spriteX + i * tileW}em -${spriteY + j * tileH}em}`,
                backgroundSize: `${tileW}em ${tileH}em`,
                imageRendering: 'pixelated',
            }} />))}
    </div>;
}

