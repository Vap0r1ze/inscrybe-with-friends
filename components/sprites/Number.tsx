import { SpriteSheets } from '@/lib/constants';
import Sprite from './Sprite';

export default function Number({ n }: { n: number }) {
    const digits = n.toString().split('').map(d => parseInt(d));

    return <div style={{ display: 'flex', gap: '1em' }}>
        {digits.map((d, i) => <div key={i} style={{}}>
            <Sprite sheet={SpriteSheets.Digits} pos={{ x: d, y: 0 }} />
        </div>)}
    </div>;
}
