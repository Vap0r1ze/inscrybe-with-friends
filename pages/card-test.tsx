import styles from './index.module.css';
import cardStyles from '@/components/sprites/Card.module.css';
import CostSprite from '@/components/sprites/CostSprite';
import { Cost, MoxType, SpecialStat } from '@/lib/engine/Card';
import { CardSprite } from '@/components/sprites/CardSprite';
import { Sigil } from '@/lib/engine/Sigil';
import { Assets } from '@/lib/constants';
import Asset from '@/components/sprites/Asset';
import StatSprite from '@/components/sprites/StatSprite';
import { useState } from 'react';
import classNames from 'classnames';

const inputStyle = {
    color: 'rgba(0, 0, 0, 0.7)',
    background: '#e4edbd',
    fontSize: '1.25rem',
    padding: '0.25em',
    fontFamily: 'GBC, monospace',
    fontWeight: '800',
};
const longInputStyle = {
    ...inputStyle,
    marginBottom: '2rem',
    width: '100%',
};

export default function CardTest() {
    const [flipped, setFlipped] = useState(false);

    const [face, setFace] = useState('https://cdn.discordapp.com/attachments/773338520563351552/1107099220088987738/card_empty_rare.png');
    const [back, setBack] = useState('https://cdn.discordapp.com/attachments/773338520563351552/1107099087393804431/cardback.png');
    const [portrait, setPortrait] = useState('https://cdn.discordapp.com/attachments/773338520563351552/1107098978065055886/grizzly.png');
    const [frame, setFrame] = useState('https://cdn.discordapp.com/attachments/773338520563351552/1107099210379186246/rare_frame_nature.png');
    const [costAmount, setCostAmount] = useState(3);
    const [costType, setCostType] = useState<Cost['type']>('blood');
    const [power, setPower] = useState(3);
    const [health, setHealth] = useState(3);

    const [sigils, setSigils] = useState([
        'https://cdn.discordapp.com/attachments/773338520563351552/1107099157434474586/splitstrike.png',
        'https://cdn.discordapp.com/attachments/1107085305514840064/1107110541845078026/sentry.png',
    ]);

    const maxAmount = {
        blood: 4,
        bone: 13,
        energy: 6,
        mox: MoxType.Blue | MoxType.Green | MoxType.Orange,
    };
    if (maxAmount[costType] < costAmount) setCostAmount(maxAmount[costType]);

    const cost: Cost = costType === 'mox' ? {
        type: costType,
        needs: costAmount,
    } : {
        type: costType,
        amount: costAmount,
    };

    return (
        <main style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            minHeight: '100vh',
            flexWrap: 'wrap',
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                flex: '1',
            }}>
                <h1>Face</h1>
                <input onChange={e => setFace(e.target.value)} value={face} style={longInputStyle} />

                <h1>Back</h1>
                <input onChange={e => setBack(e.target.value)} value={back} style={longInputStyle} />

                <h1>Portrait</h1>
                <input onChange={e => setPortrait(e.target.value)} value={portrait} style={longInputStyle} />

                <h1>Frame</h1>
                <input onChange={e => setFrame(e.target.value)} value={frame} style={longInputStyle} />

                <h1>Sigils</h1>
                <div style={{
                    marginBottom: '2rem',
                }}>
                    {sigils?.map((sigil, i) => <input key={i} onChange={e => {
                        sigils[i] = e.target.value;
                        setSigils([...sigils]);
                    }} value={sigil} style={{
                        ...longInputStyle,
                        marginBottom: '0.5rem',
                    }} />)}
                </div>

                <div style={{
                    display: 'flex',
                    width: '100%',
                    justifyContent: 'space-between',
                    gap: '1rem',
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        <h1>Cost</h1>
                        <div style={{
                            display: 'flex',
                            gap: '1rem',
                        }}>
                            <select onChange={e => setCostType(e.target.value as Cost['type'])} style={inputStyle}>
                                <option value="blood">Blood</option>
                                <option value="bone">Bones</option>
                                <option value="energy">Energy</option>
                                <option value="mox">Mox</option>
                            </select>
                            <input type="number" onChange={e => setCostAmount(+e.target.value)} min={0} step={1} value={costAmount} style={inputStyle} />
                        </div>
                    </div>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        <h1>Power</h1>
                        <input type="number" onChange={e => setPower(+e.target.value)} min={0} step={1} value={power} style={inputStyle} />
                    </div>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        <h1>Health</h1>
                        <input type="number" onChange={e => setHealth(+e.target.value)} min={1} step={1} value={health} style={inputStyle} />
                    </div>
                </div>
            </div>

            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '0.25rem',
                padding: '8rem',
                height: '100%',
            }}>
                <div className={cardStyles.card} onClick={() => setFlipped(f => !f)}>
                    <div className={classNames({
                        [cardStyles.cardContent]: true,
                        [cardStyles.flipped]: flipped,
                    })}>
                        <div className={cardStyles.cardFront}>
                            <div className={cardStyles.cardFace}>
                                <Asset path={face} />
                            </div>
                            <div className={cardStyles.cardPortrait}>
                                <Asset path={portrait} />
                            </div>
                            {frame && <div className={cardStyles.cardFrame}>
                                <Asset path={frame} />
                            </div>}
                            <div className={cardStyles.cardSigils}>
                                {sigils?.map(sigil => <div key={sigil} className={cardStyles.cardSigil}>
                                    <Asset path={sigil} />
                                </div>)}
                            </div>
                            {costAmount && <div className={cardStyles.cardCost}>
                                <CostSprite cost={cost} />
                            </div>}
                            <div className={cardStyles.cardStats}>
                                <StatSprite stat={power} />
                                <StatSprite stat={health} />
                            </div>
                        </div>
                        <div className={cardStyles.cardBack}>
                            <Asset path={back} />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
