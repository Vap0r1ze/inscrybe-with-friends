import { Stat } from '@/lib/engine/Card';
import { Number } from './Number';
import { Sprite } from './Sprite';
import { Spritesheets } from '@/lib/spritesheets';

export interface StatSpriteProps {
    className?: string;
    onContextMenu?: () => void;
    stat: Stat;
}
export function StatSprite({ stat, onContextMenu, className }: StatSpriteProps) {
    const statEl = typeof stat === 'number'
        ? <Number n={stat} />
        : <Sprite sheet={Spritesheets.stats} name={stat} />;

    return <div className={className} onContextMenu={onContextMenu}>{statEl}</div>;
}
