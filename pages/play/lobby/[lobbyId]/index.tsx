import styles from './index.module.css';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/router';
import { Text } from '@/components/ui/Text';
import { Box } from '@/components/ui/Box';
import Image from 'next/image';
import { Select } from '@/components/inputs/Select';
import { Button } from '@/components/inputs/Button';
import { useEffect, useRef } from 'react';
import { pusherClient } from '@/lib/pusher';
import { defaultFightOptions, zFightOptions } from '@/lib/online/z';
import { stringify } from 'yaml';
import { FightSide } from '@/lib/engine/Fight';

export default function Lobby() {
    const router = useRouter();
    const lobbyId = router.query.lobbyId as string;
    const lobby = trpc.lobbies.get.useQuery({
        id: lobbyId,
    }, {
        refetchOnMount: true,
        refetchOnWindowFocus: false,
    });
    const user = trpc.user.getUser.useQuery(void 0, {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });

    const lobbyExistedRef = useRef(false);
    useEffect(() => {
        if (lobby.data) lobbyExistedRef.current = true;
    }, [lobby.data]);

    const pending = lobby.isLoading || user.isLoading;
    const isInGame = !pending && lobby.data?.playerships.some(p => p.userId === user.data?.id);
    const isOwner = !pending && lobby.data?.ownerId === user.data?.id;

    const player = lobby.data?.playerships.find(p => p.userId.toString() === lobby.data?.sides.player);
    const opposing = lobby.data?.playerships.find(p => p.userId.toString() === lobby.data?.sides.opposing);

    const decks = trpc.decks.getOwn.useQuery(void 0, {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });

    const hasGame = !!(!pending && lobby.data?.gameId);

    const canStartGame = !pending && player && opposing && player !== opposing
        && lobby.data?.decks && lobby.data.decks[`${player.userId}`] && lobby.data.decks[`${opposing.userId}`];

    useEffect(() => {
        const channelId = `private-lobby@${lobbyId}`;
        const channel = pusherClient.subscribe(channelId);
        channel.bind('refetch', ({ from }: { from: string }) => {
            if (from !== user.data?.id) lobby.refetch();
        });
        channel.bind('game-start', () => {
            onEnterGame();
        });
        return () => pusherClient.unsubscribe(channelId);
    }, [lobbyId]); // eslint-disable-line react-hooks/exhaustive-deps

    const deleteLobby = trpc.lobbies.delete.useMutation({ onSuccess: () => router.push('/play') });
    const onDeleteLobby = () => deleteLobby.mutate({ id: lobbyId });

    const joinLobby = trpc.lobbies.join.useMutation({ onSuccess: () => lobby.refetch() });
    const onJoinLobby = () => joinLobby.mutate({ id: lobbyId });

    const leaveLobby = trpc.lobbies.leave.useMutation({ onSuccess: () => lobby.refetch() });
    const onLeaveLobby = () => leaveLobby.mutate({ id: lobbyId });

    const setPlayerSide = trpc.lobbies.setPlayerSide.useMutation({ onSuccess: () => lobby.refetch() });
    const onSetPlayerSide = (userId: string, side: FightSide) => {
        if (lobby.data?.sides[side] === userId) return;
        setPlayerSide.mutate({ id: lobbyId, side, userId });
    };

    const selectOwnDeck = trpc.lobbies.selectOwnDeck.useMutation({ onSuccess: () => lobby.refetch() });
    const onSelectDeck = (deckName: string) => {
        if (user.data && lobby.data?.decks[user.data.id] === deckName) return;
        selectOwnDeck.mutate({ id: lobbyId, deck: deckName });
    };

    const startGame = trpc.game.start.useMutation({ onSuccess: () => lobby.refetch() });
    const onStartGame = () => {
        if (!canStartGame) return;
        startGame.mutate({ lobbyId });
    };

    const onEnterGame = () => {
        router.push(`/play/lobby/${lobbyId}/game`);
    };

    const forfeitGame = trpc.game.forfeit.useMutation({ onSuccess: () => lobby.refetch() });
    const onForfeitGame = () => {
        if (!lobby.data) return;
        forfeitGame.mutate({ lobbyId: lobby.data.id });
    };

    // TODO: error handling

    return <div className={styles.lobby}>
        {lobby.data && <div className={styles.panels}>
            <Box>
                <Text size={12}>Lobby</Text>
                {/* TODO: Lobby settings editor */}
                <Text>{stringify(Object.assign(defaultFightOptions(), zFightOptions.partial().parse(lobby.data.options)))}</Text>
                {isOwner && <>
                    <Button
                        disabled={deleteLobby.isLoading}
                        onClick={onDeleteLobby}
                    ><Text>Delete Lobby</Text></Button>
                    {deleteLobby.error && <Text>{deleteLobby.error.message}</Text>}
                </>}
            </Box>
            <Box>
                <Text size={12}>Game</Text>
                <div className={styles.vs}>
                    {(isOwner && !hasGame) ? <Select
                        options={lobby.data.playerships.map(p => [p.userId, p.user.name])}
                        className={styles.select}
                        placeholder="Select Player"
                        disabled={setPlayerSide.isLoading}
                        onSelect={id => onSetPlayerSide(id, 'player')}
                        value={player?.userId.toString() ?? ''}
                    /> : <Text size={16}>{player?.user.name ?? '...'}</Text>}
                    <Text>vs</Text>
                    {(isOwner && !hasGame) ? <Select
                        options={lobby.data.playerships.map(p => [p.userId, p.user.name])}
                        className={styles.select}
                        placeholder="Select Player"
                        disabled={setPlayerSide.isLoading}
                        onSelect={id => onSetPlayerSide(id, 'opposing')}
                        value={opposing?.userId.toString() ?? ''}
                    /> : <Text size={16}>{opposing?.user.name ?? '...'}</Text>}
                </div>
                {(isOwner && !hasGame) && (
                    <Button
                        disabled={!canStartGame || startGame.isLoading}
                        onClick={onStartGame}
                    ><Text>Start Game</Text></Button>
                )}
                {hasGame && (
                    <Button
                        onClick={onEnterGame}
                    ><Text>Enter Game</Text></Button>
                )}
                {(isInGame && hasGame) && (
                    <Button
                        onClick={onForfeitGame}
                    ><Text>Forfeit Game</Text></Button>
                )}
            </Box>
            <Box className={styles.playerPanel}>
                <Text size={12}>Players</Text>
                {lobby.data.playerships.map(playership => (
                    <div key={playership.userId} className={styles.playerRow}>
                        <div className={styles.player}>
                            <Image
                                alt="Profile picture"
                                src={playership.user.image}
                                width={16}
                                height={16}
                                className={styles.profilePicture}
                            />
                            <Text>{playership.user.name}{playership.user.id === lobby.data?.ownerId ? ' [LEADER]' : ''}</Text>
                        </div>
                        {Object.values(lobby.data!.sides).includes(`${playership.userId}`)
                        && (playership.userId === user.data?.id ? <Select
                            className={styles.selectDeck}
                            options={decks.data?.map(d => [d.name, d.name]) ?? []}
                            placeholder="Select Deck"
                            value={lobby.data?.decks[playership.userId] ?? ''}
                            onSelect={onSelectDeck}
                            disabled={selectOwnDeck.isLoading || decks.isLoading}
                            readonly={hasGame}
                        /> : <Select
                            className={styles.selectDeck}
                            options={(() => {
                                const deckName = lobby.data?.decks[playership.userId];
                                return deckName ? [[deckName, deckName]] : [];
                            })()}
                            placeholder="No Deck Selected"
                            value={lobby.data?.decks[playership.userId] ?? ''}
                            readonly
                        />)}
                    </div>
                ))}
                {isInGame ? (
                    <Button
                        disabled={hasGame || pending || isOwner || leaveLobby.isLoading}
                        onClick={onLeaveLobby}
                    ><Text>Leave Game</Text></Button>
                ) : (
                    <Button
                        disabled={pending || isInGame || joinLobby.isLoading}
                        onClick={onJoinLobby}
                    ><Text>Join Game</Text></Button>
                )}
            </Box>
        </div>}
        {lobby.isFetched && !lobby.data && <Box>
            <Text size={12}>{lobbyExistedRef.current ? 'Lobby was deleted' : 'Lobby not found'}</Text>
        </Box>}
    </div>;
}
