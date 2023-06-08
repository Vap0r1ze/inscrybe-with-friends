import styles from './LeftInfo.module.css';
import { SpriteButton } from './ui/SpriteButton';
import { Status } from './ui/Status';
import { useClientActions, useClientProp, useFight } from '@/hooks/useClientStore';
import { memo } from 'react';
import { Sprite } from '../sprites/Sprite';
import { useBattleSheet } from '@/hooks/useBattleTheme';
import { triggerSound } from '@/hooks/useAudio';

export const LeftInfo = memo(function LeftInfo() {
    const battleTheme = useBattleSheet();
    const isPlayTurn = useFight(fight => fight.turn.side === 'player' && fight.turn.phase === 'play');
    const [hammering, setHammering] = useClientProp('hammering');
    const { sendAction } = useClientActions();

    const onRing = () => {
        sendAction('bellRing', {});
    };
    const onHammerToggle = () => {
        setHammering(!hammering);
        if (!hammering) triggerSound('select');
    };

    return <div className={styles.left}>
        <Sprite className={styles.bg} sheet={battleTheme} name="boardLeft" />
        <div className={styles.info}>
            <Status side="opposing" />
            <SpriteButton sheet={battleTheme} name="bell" disabled={!isPlayTurn} onClick={onRing} />
            <SpriteButton sheet={battleTheme} name="hammer" disabled={!isPlayTurn} selected={hammering} onClick={onHammerToggle} />
            <Status side="player" />
        </div>
    </div>;
});
