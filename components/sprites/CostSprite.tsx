import { SpriteSheets } from '@/lib/constants';
import Sprite from './Sprite';
import { Cost } from '@/lib/game/Card';

export default function CostSprite({ cost }: { cost: Cost }) {
    const pos = { x: 0, y: 0 };
    if (cost.type === 'blood') {
        pos.x = 1;
        pos.y = cost.amount - 1;
    } else if (cost.type === 'bone') {
        if (cost.amount > 10) {
            pos.x = 1;
            pos.y = -3;
        }
        pos.y += cost.amount - 1;
    } else if (cost.type === 'energy') {
        pos.x = 3;
        pos.y = cost.amount - 1;
    } else if (cost.type === 'mox') {
        pos.x = 2;
        pos.y = cost.needs - 1;
    }
    return <Sprite sheet={SpriteSheets.CardCosts} pos={pos} />;
}
