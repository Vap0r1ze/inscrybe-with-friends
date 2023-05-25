import { Spritesheet } from '@/lib/spritesheets';

export interface SpriteProps {
    sheet: Spritesheet;
    name: string;
}
export default function Sprite({ sheet, name }: SpriteProps) {
    const sprite = sheet.sprites[name];
    let [x, y] = sprite;
    const [sheetWidth, sheetHeight] = sheet.size;
    const [tileWidth, tileHeight] = sheet.tiled?.tileSize ?? sprite.slice(2, 4);
    if (sheet.tiled) {
        x = sheet.tiled.borderWidth.out + x * (tileWidth + sheet.tiled.borderWidth.in);
        y = sheet.tiled.borderWidth.out + y * (tileHeight + sheet.tiled.borderWidth.in);
    }

    return <div style={{
        backgroundImage: `url(${sheet.path})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${sheetWidth}em ${sheetHeight}em`,
        backgroundPosition: `-${x}em -${y}em`,
        imageRendering: 'pixelated',
        width: `${tileWidth}em`,
        height: `${tileHeight}em`,
    }}/>;
}
