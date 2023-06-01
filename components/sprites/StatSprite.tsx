import { Stat } from '@/lib/engine/Card';
import { Number } from './Number';
import { Sprite } from './Sprite';
import { Spritesheets } from '@/lib/spritesheets';

export default function StatSprite({ stat }: { stat: Stat }) {
    if (typeof stat === 'number') return <Number n={stat} />;

    return <Sprite sheet={Spritesheets.stats} name={stat} />;
}
