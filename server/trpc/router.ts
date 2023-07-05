import { router } from '@/server/trpc';
import { deckRouter } from './decks';
import { lobbiesRouter } from './lobbies';
import { userRouter } from './users';
import { pusherRouter } from './pusher';
import { gameRouter } from './game';


export const trpcRouter = router({
    decks: deckRouter,
    lobbies: lobbiesRouter,
    user: userRouter,
    pusher: pusherRouter,
    game: gameRouter,
});

export type AppRouter = typeof trpcRouter;
