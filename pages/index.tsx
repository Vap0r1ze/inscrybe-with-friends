import { CardSprite } from '@/components/sprites/CardSprite';
import styles from './index.module.css';

export default function Home() {
    return (
        <main className={styles.main}>
            <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                width: '100%',
                height: '18em',
                padding: '2em',
                gap: '2em',
                backgroundColor: '#1f2028',
            }}>
                <div style={{
                    backgroundColor: '#6c765a',
                    border: '1em solid #00070e',
                    width: '18em',
                    height: '18em',
                }}></div>
                <div className={styles.test}>
                    <div style={{
                        width: '14em',
                        height: '14em',
                        backgroundColor: '#d7e2a3',
                        border: '1em solid #020a11',
                    }} />
                </div>
                <div style={{
                    width: '14em',
                    height: '14em',
                    backgroundColor: '#d7e2a3',
                    border: '1em solid #020a11',
                }} />
            </div>
            <div style={{
                flex: 1,
                padding: '4em',
            }}>
                <CardSprite print={{
                    name: 'Vampire Bats',
                    power: 2,
                    health: 1,
                    cost: {
                        type: 'blood',
                        amount: 1,
                    },
                    frame: 'nature_frame',
                    sigils: ['airborne', 'vampiric'],
                    portrait: 'vampBats',
                    face: 'rare',
                }} />
            </div>
        </main>
    );
}
