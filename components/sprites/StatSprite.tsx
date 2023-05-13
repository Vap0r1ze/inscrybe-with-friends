import { SpriteSheets } from '@/lib/constants';
import { SpecialStat, Stat } from '@/lib/game/Card';
import Number from './Number';
import Sprite from './Sprite';

const specialStats = [
    SpecialStat.MoxCounter,
    SpecialStat.AntCounter,
    SpecialStat.TurnCounter,
    SpecialStat.Mirror,
    SpecialStat.CardCounter,
];

export default function StatSprite({ stat }: { stat: Stat }) {
    if (typeof stat === 'number') return <Number n={stat} />;

    const idx = specialStats.indexOf(stat);
    const x = Math.floor(idx / SpriteSheets.SpecialStats.size.height);
    const y = idx % SpriteSheets.SpecialStats.size.height;

    return <Sprite sheet={SpriteSheets.SpecialStats} pos={{ x, y }}/>;
}
