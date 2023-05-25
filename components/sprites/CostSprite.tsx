import { Spritesheets } from '@/lib/spritesheets';
import Sprite from './Sprite';
import { Cost } from '@/lib/engine/Card';

export default function CostSprite({ cost }: { cost: Cost }) {
    const amount = cost.type === 'mox' ? cost.needs : cost.amount;
    const name = `${cost.type}${amount}`;

    return <Sprite sheet={Spritesheets.costs} name={name} />;
}
