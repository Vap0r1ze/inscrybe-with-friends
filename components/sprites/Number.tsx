import { Spritesheets } from '@/lib/spritesheets';
import Sprite from './Sprite';

export default function Number({ n }: { n: number }) {
    const digits = n.toString().split('');

    return <div style={{ display: 'flex', gap: '1em' }}>
        {digits.map((d, i) => <div key={i} style={{}}>
            <Sprite sheet={Spritesheets.chars} name={d} />
        </div>)}
    </div>;
}
