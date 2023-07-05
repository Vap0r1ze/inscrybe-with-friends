import styles from './index.module.css';
import classNames from 'classnames';
import { Button } from '@/components/inputs/Button';
import { Box } from '@/components/ui/Box';
import { Text } from '@/components/ui/Text';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/router';

export default function Play() {
    const router = useRouter();
    const playerships = trpc.lobbies.getOwnPlayerships.useQuery();

    const createLobby = trpc.lobbies.create.useMutation({
        onSuccess: () => playerships.refetch(),
    });
    const onCreateLobby = () => {
        createLobby.mutate();
    };

    const openLobby = (lobbyId: string) => {
        router.push(`/play/lobby/${lobbyId}`);
    };

    return <div className={styles.playMenu}>
        <Box className={styles.lobbies}>
            <Text size={12}>Lobbies</Text>
            <div className={classNames(styles.lobbiesInner, {
                [styles.fetching]: playerships.isFetching,
            })}>
                {playerships.data?.map(playership => (
                    <div key={playership.lobbyId} className={styles.lobby}>
                        <Button className={styles.lobbyBtn} onClick={() => openLobby(playership.lobbyId)}>
                            <Text fit>{playership.lobby.name ?? 'New Lobby'}</Text>
                        </Button>
                    </div>
                ))}
                {playerships.isFetching && !playerships.data?.length && (
                    <Text>Loading...</Text>
                )}
                <Button onClick={onCreateLobby} disabled={createLobby.isLoading} className={styles.newLobby}>
                    <Text>Create Lobby</Text>
                </Button>
                {createLobby.error && <div className={styles.error}>
                    <Text size={8}>{createLobby.error.message}</Text>
                </div>}
            </div>
        </Box>
        <Box>
            <Button onClick={() => router.push('/play/edit-decks')}>
                <Text>Edit Decks</Text>
            </Button>
        </Box>
    </div>;
}
