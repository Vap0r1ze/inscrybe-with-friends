import { Stat } from '@/lib/engine/Card';
import { Number } from './Number';
import { Sprite } from './Sprite';
import { Spritesheets } from '@/lib/spritesheets';

export default function StatSprite({ stat, className }: { stat: Stat, className?: string }) {
    const statEl = typeof stat === 'number'
        ? <Number n={stat} />
        : <Sprite sheet={Spritesheets.stats} name={stat} />;

    return <div className={className}>{statEl}</div>;
}
