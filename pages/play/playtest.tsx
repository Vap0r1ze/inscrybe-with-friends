import { DevMenu } from '@/components/DevMenu';
import styles from './playtest.module.css';
import { Text } from '@/components/Text';
import { Client } from '@/components/client/Client';
import { Button } from '@/components/inputs/Button';
import { Select } from '@/components/inputs/Select';
import { Box } from '@/components/ui/Box';
import { useClientStore } from '@/hooks/useClientStore';
import { useDeckStore } from '@/hooks/useDeckStore';
import { useGameStore } from '@/hooks/useGameStore';
import { useStore } from '@/hooks/useStore';
import { FIGHT_SIDES, FightSide, createFight, translateFight } from '@/lib/engine/Fight';
import { createFightHost } from '@/lib/engine/Host';
import { oppositeSide } from '@/lib/engine/utils';
import { clone, entries, fromEntries } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

export default function PlayTest() {
    return <ErrorBoundary fallbackRender={TheError}>
        <PlayTestReal />
    </ErrorBoundary>;
}

function TheError({ error }: FallbackProps) {
    const onTryFix = () => {
        localStorage.removeItem('games');
        window.location.reload();
    };

    const message = (error?.stack ?? `${error}`).split('\n').slice(0, 5).join('\n');

    return <Box>
        <div>
            <Text size={14}>Something is VERY Broken</Text>
            <Text className={styles.borkStack}>{message}</Text>
            <Button onClick={onTryFix}><Text size={20}>Delete Game and Refresh</Text></Button>
        </div>
    </Box>;
}

function PlayTestReal() {
    const deckStore = useStore(useDeckStore, state => state.decks);
    const game = useStore(useGameStore, state => state.games.playtest);
    const currentTurn = useStore(useGameStore, state => state.games.playtest?.host.fight.turn.side);
    const currentPhase = useStore(useGameStore, state => state.games.playtest?.host.fight.turn.phase);

    const [selectedDecks, setSelectedDecks] = useState<Record<FightSide, string | null>>({
        player: null,
        opposing: null,
    });
    const [currentSide, setCurrentSide] = useState<FightSide>('player');
    const [autoSwitch, setAutoSwitch] = useState(false);
    const [skipDraw, setSkipDraw] = useState(false);
    const [devMode, setDevMode] = useState(false);

    const noDecks = !!deckStore && !Object.keys(deckStore).length;

    useEffect(() => {
        if (currentTurn && currentSide !== currentTurn && autoSwitch) {
            setCurrentSide(currentTurn);
        }
    }, [currentTurn, autoSwitch, currentSide]);
    useEffect(() => {
        if (currentPhase === 'draw' && skipDraw) {
            useGameStore.getState().createEvent('playtest', {
                type: 'phase',
                phase: 'play',
            });
        }
    }, [currentPhase, skipDraw]);

    useEffect(() => {
        if (!game) return;

        if (game.forceTranslate !== currentSide) {
            useGameStore.getState().setGame('playtest', game => ({ ...game, forceTranslate: currentSide }));
            const fight = translateFight(clone(game.host.fight), currentSide);
            useClientStore.getState().newClient('playtest', fight);
        } else if (!useClientStore.getState().clients.playtest) {
            const fight = translateFight(clone(game.host.fight), currentSide);
            useClientStore.getState().newClient('playtest', fight);
        }
    }, [game, currentSide]);

    const onFightStart = () => {
        if (game || !deckStore || Object.values(selectedDecks).some(deck => !deck)) return;

        const decks = fromEntries(entries(selectedDecks).map(([side, deck]) => [side, deckStore[deck!]]));

        const fight = createFight({
            features: [],
            hammersPerTurn: 1,
            lanes: 4,
            lives: 2,
            startingHand: 3,
        }, FIGHT_SIDES, decks);
        const host = createFightHost(fight);

        useGameStore.getState().newGame('playtest', host);
        useGameStore.getState().setGame('playtest', (game) => ({ ...game, forceTranslate: currentSide }));
        useClientStore.getState().newClient('playtest', translateFight(clone(fight), currentSide));
        useGameStore.getState().startHost('playtest');
    };
    const onKillGame = () => {
        if (!game) return;

        useGameStore.getState().deleteGame('playtest');
        useClientStore.getState().deleteClient('playtest');
    };
    const onSwitchSide = () => {
        if (!game) return;

        setCurrentSide(side => oppositeSide(side));
    };
    const toggleAutoSwitch = () => {
        setAutoSwitch(auto => !auto);
    };
    const toggleSkipDraw = () => {
        setSkipDraw(skip => !skip);
    };

    return <div style={{
        color: 'var(--ui)',
    }}>
        {!game ? <div>
            {FIGHT_SIDES.map(side => <div key={side}>
                <Text>{side[0].toUpperCase() + side.slice(1)}</Text>
                <Select
                    options={Object.keys(deckStore ?? []).map(key => [key, key])}
                    disabled={noDecks}
                    placeholder={noDecks ? 'No decks' : 'Select Deck'}
                    onSelect={deck => setSelectedDecks({ ...selectedDecks, [side]: deck })}
                    value={selectedDecks[side]}
                />
            </div>)}
            <Button
                disabled={Object.values(selectedDecks).some(deck => !deck)}
                onClick={onFightStart}
            ><Text>Start Fight</Text></Button>
        </div> : <div style={{ position: 'relative' }}>
            <Box>
                <div className={styles.controls}>
                    <Button onClick={onKillGame}><Text>Kill Game</Text></Button>
                    <Button onClick={onSwitchSide}><Text>Switch Side</Text></Button>
                    <Button onClick={toggleAutoSwitch}><Text>{autoSwitch ? 'Auto Switch: ON' : 'Auto Switch: OFF'}</Text></Button>
                    <Button onClick={toggleSkipDraw}><Text>{skipDraw ? 'Skip Draw Phase: ON' : 'Skip Draw Phase: OFF'}</Text></Button>
                    <Button onClick={() => setDevMode(true)}><Text>Dev Menu</Text></Button>
                    <Text>Playing as <span style={{ textTransform: 'uppercase' }}>{currentSide}</span></Text>
                </div>
            </Box>
            <Client key={currentSide} id="playtest" debug />
            {devMode && <DevMenu id="playtest" onClose={() => setDevMode(false)} />}
        </div>}
    </div>;
}
