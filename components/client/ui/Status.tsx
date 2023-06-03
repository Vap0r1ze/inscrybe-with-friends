import styles from './Status.module.css';
import { useFight } from '@/hooks/useClientStore';
import { prints } from '@/lib/defs/prints';
import { MoxType, getBloods, getMoxes } from '@/lib/engine/Card';
import { FightSide } from '@/lib/engine/Fight';
import { Sprite } from '../../sprites/Sprite';
import { Spritesheets } from '@/lib/spritesheets';
import { Number } from '../../sprites/Number';
import { memo } from 'react';

export const Status = memo(function Status({ side }: { side: FightSide }) {
    const player = useFight(fight => fight.players[side]);
    const lanes = useFight(fight => fight.field[side]);

    const maxEnergy = 6;
    const [energy, totalEnergy] = player.energy;
    const getEnergyType = (i: number) => {
        if (i < energy) return 'energy';
        if (i < totalEnergy) return 'energyUsed';
        return 'energyEmpty';
    };

    const moxes = getMoxes(lanes);

    const bloods = getBloods(prints, lanes);

    return <div className={styles.status}>
        <div className={styles.statusRow}>
            <div className={styles.bones}>
                <Sprite sheet={Spritesheets.battle} name="bones" />
                <Number className={styles.boneAmount} x n={player.bones} />
            </div>
            <div className={styles.energy}>
                {Array.from({ length: maxEnergy }, (_, i) => (
                    <Sprite key={i} sheet={Spritesheets.battle} name={getEnergyType(i)} />
                ))}
            </div>
        </div>
        <div className={styles.statusRow}>
            <div className={styles.moxes}>
                <Sprite sheet={Spritesheets.battle} name={'moxG' + (moxes & MoxType.Green ? '' : 'Empty')} />
                <Sprite sheet={Spritesheets.battle} name={'moxO' + (moxes & MoxType.Orange ? '' : 'Empty')} />
                <Sprite sheet={Spritesheets.battle} name={'moxB' + (moxes & MoxType.Blue ? '' : 'Empty')} />
            </div>
            <div className={styles.bloods}>
                {lanes.map((_, i) => (
                    <Sprite key={i} sheet={Spritesheets.battle} name={'blood' + ((bloods <= i) ? 'Empty' : '')} />
                ))}
            </div>
        </div>
    </div>;
});
