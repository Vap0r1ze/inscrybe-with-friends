export interface SpriteSheet {
    path: string;
    borders?: { in: number, out: number };
    tileSize: { width: number, height: number };
    size: { width: number, height: number };
}
export interface SpriteProps {
    sheet: SpriteSheet;
    pos?: { x: number, y: number };
}
export default function Sprite({ sheet, pos = { x: 0, y: 0 } }: SpriteProps) {
    const borders = sheet.borders ?? { in: 0, out: 0 };
    const x = borders.out + pos.x * (sheet.tileSize.width + borders.in);
    const y = borders.out + pos.y * (sheet.tileSize.height + borders.in);
    const sheetWidth = borders.out * 2 + sheet.tileSize.width * sheet.size.width + borders.in * (sheet.size.width - 1);
    const sheetHeight = borders.out * 2 + sheet.tileSize.height * sheet.size.height + borders.in * (sheet.size.height - 1);

    return <div style={{
        backgroundImage: `url(${sheet.path})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${sheetWidth}em ${sheetHeight}em`,
        backgroundPosition: `-${x}em -${y}em`,
        imageRendering: 'pixelated',
        width: `${sheet.tileSize.width}em`,
        height: `${sheet.tileSize.height}em`,
    }}/>;
}
