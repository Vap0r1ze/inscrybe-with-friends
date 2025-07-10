import { useFight } from '@/hooks/useClientStore';
import { FightSide } from '@/lib/engine/Fight';
import { memo } from 'react';
import styles from './HiddenHand.module.css';
import { CardSelection } from '../animations/CardSelection';
import { CardOrPrint } from '@/lib/engine/Card';

export type HiddenHandProps = {
    side: FightSide
};
export const HiddenHand = memo(function HiddenHand({ side }: HiddenHandProps) {
    const handSize = useFight(fight => fight.players[side].handSize);

    const dummyCards = Array.from<unknown, CardOrPrint>({ length: handSize }, () => ({
        print: 'squirrel',
        state: {
            health: 0,
            power: 0,
            sigils: [],
            flipped: true,
        },
    }));

    return <div className={styles.hiddenHand}>
        <CardSelection cards={dummyCards} padding={20} />
    </div>;
});
