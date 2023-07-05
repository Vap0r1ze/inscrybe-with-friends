import styles from './game.module.css';
import { useRouter } from 'next/router';
import { trpc } from '@/lib/trpc';
import { useEffect, useState } from 'react';
import { useGameStore } from '@/hooks/useGameStore';
import { useClientStore } from '@/hooks/useClientStore';
import { createFight } from '@/lib/engine/Fight';
import { clone } from '@/lib/utils';
import { Text } from '@/components/ui/Text';
import { subscribeGameEnd, subscribeGamePacket } from '@/lib/pusher';
import { Client } from '@/components/client/Client';
import { Button } from '@/components/inputs/Button';
import { Box } from '@/components/ui/Box';

export default function Game() {
    const router = useRouter();
    const lobbyId = router.query.lobbyId as string;
    const lobby = trpc.lobbies.get.useQuery({
        id: lobbyId,
    }, {
        refetchOnMount: true,
        refetchOnWindowFocus: false,
    });

    const gameId = lobby.data?.gameId ?? null;

    const game = trpc.game.get.useQuery({ gameId: gameId!, includeInitPacket: true }, {
        refetchOnMount: true,
        enabled: !!gameId,
        refetchOnWindowFocus: false,
    });

    const clientReady = useClientStore(state => !!(gameId && state.clients[gameId])) && !game.isError;

    const [debug, setDebug] = useState(false);
    const [gameEndMessage, setGameEndMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!game.data) return;

        const cloudGame = useGameStore.getState().getCloudGame(game.data.id, true);
        const willPlayInit = game.data.initPacket && !cloudGame.playedInit;

        console.log('game.data', game.data, willPlayInit);

        let client = useClientStore.getState().clients[game.data.id];
        if (!client) {
            const fightData = clone(game.data.fight);
            const fight = willPlayInit ? createFight(fightData.opts, ['player'], fightData.decks) : fightData;
            useClientStore.getState().newClient(game.data.id, fight);
            client = useClientStore.getState().clients[game.data.id]!;
        }

        if (willPlayInit) useGameStore.getState().handleCloudPacket(game.data.id, game.data.initPacket!);

        const unsubPackets = subscribeGamePacket(game.data.id, (packet) => {
            useGameStore.getState().handleCloudPacket(game.data.id, packet);
        });
        return unsubPackets;
    }, [game.data]);

    useEffect(() => {
        if (!gameId) return;
        return subscribeGameEnd(gameId, (message) => {
            setGameEndMessage(message);
        });
    }, [gameId, setGameEndMessage]);

    const onBackToLobby = () => {
        router.push(`/play/lobby/${lobbyId}`);
    };

    useEffect(() => {
        const onClientKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'KeyD' && e.shiftKey) setDebug(debug => !debug);
        };
        window.addEventListener('keydown', onClientKeyDown);
        return () => window.removeEventListener('keydown', onClientKeyDown);
    }, []);

    const gameIssue = game.error ? 'Error getting game data' :
        !gameId ? 'No game has started yet' :
            !clientReady ? 'Client missing' : 'Unknown error';

    return <div className={styles.game}> {(clientReady && gameId)
        ? <div className={styles.clientRoot}>
            <Client className={styles.client} id={gameId} debug={debug} />
            {gameEndMessage && <div className={styles.gameEndBackdrop}>
                <Box className={styles.gameEnd}>
                    <Text size={12}>{gameEndMessage}</Text>
                    <Button onClick={onBackToLobby}><Text>Back to Lobby</Text></Button>
                </Box>
            </div>}
        </div>
        : (game.isLoading && gameId) ? <Text>Getting game data...</Text>
            : <div>
                <Text>{gameIssue}</Text>
                <Button onClick={onBackToLobby}><Text>Back to Lobby</Text></Button>
            </div>
    }</div>;
}
