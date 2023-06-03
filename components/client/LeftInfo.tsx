import styles from './LeftInfo.module.css';
import { Bell } from './ui/Bell';
import { Status } from './ui/Status';
import { useClientActions, useClientProp, useFight } from '@/hooks/useClientStore';
import { memo } from 'react';
import { Button } from '../inputs/Button';
import { Text } from '../Text';

export const LeftInfo = memo(function LeftInfo() {
    const isPlayTurn = useFight(fight => fight.turn.side === 'player' && fight.turn.phase === 'play');
    const [hammering, setHammering] = useClientProp('hammering');
    const { sendAction } = useClientActions();

    const onRing = () => {
        sendAction('bellRing', {});
    };

    return <div className={styles.info}>
        {/* <Sprite sheet={Spritesheets.cards} name="slot" /> */}
        <Status side="opposing" />
        <Bell disabled={!isPlayTurn} onClick={onRing} />
        <Button disabled={!isPlayTurn} onClick={() => setHammering(!hammering)}><Text>Hammer</Text></Button>
        <Status side="player" />
    </div>;
});
