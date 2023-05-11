import { createKysely } from '@vercel/postgres-kysely';

export interface User {
    id: string;
}

interface Database {
    user: User;
}

export const db = createKysely<Database>();
