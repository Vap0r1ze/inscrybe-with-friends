import { Spritesheet } from '@/lib/spritesheets';

export interface SpriteProps {
    sheet: Spritesheet;
    name: string;
    className?: string;
}
export function Sprite({ className, sheet, name }: SpriteProps) {
    const sprite = sheet.sprites[name];
    if (!sprite) throw new Error(`Sprite ${name} not found in sheet ${sheet.path}`);

    let [x, y] = sprite;
    const [sheetWidth, sheetHeight] = sheet.size;
    const [tileWidth, tileHeight] = sprite.length === 4 ? sprite.slice(2, 4) : sheet.tiled?.tileSize ?? [1, 1];
    if (sheet.tiled && sprite.length === 2) {
        x = sheet.tiled.borderWidth.out + x * (sheet.tiled.tileSize[0] + sheet.tiled.borderWidth.in);
        y = sheet.tiled.borderWidth.out + y * (sheet.tiled.tileSize[1] + sheet.tiled.borderWidth.in);
    }

    return <div className={className} style={{
        backgroundImage: `url(${sheet.path})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${sheetWidth}em ${sheetHeight}em`,
        backgroundPosition: `-${x}em -${y}em`,
        imageRendering: 'pixelated',
        width: `${tileWidth}em`,
        height: `${tileHeight}em`,
    }}/>;
}
