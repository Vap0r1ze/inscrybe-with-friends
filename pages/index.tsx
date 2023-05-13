import CostSprite from '@/components/sprites/CostSprite';
import styles from './index.module.css';
import { MoxType, SpecialStat } from '@/lib/game/Card';
import { CardSprite } from '@/components/sprites/CardSprite';
import { Sigil } from '@/lib/game/Sigil';

export default function Home() {
    return (
        <main className={styles.main}>
            <div style={{
                fontSize: '0.25rem',
            }}>
                <CardSprite card={{
                    name: 'Headless Horseman',
                    cost: {
                        type: 'bone',
                        amount: 13,
                    },
                    health: 5,
                    power: 5,
                    sigils: [Sigil.Airborne, Sigil.Sprinter],
                    portrait: 'headlesshorseman',
                    face: 'rare',
                    frame: 'undead',
                }}/>
            </div>
        </main>
    );
}
