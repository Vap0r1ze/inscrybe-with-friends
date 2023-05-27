import { createKysely } from '@vercel/postgres-kysely';
import { Generated, Migrator } from 'kysely';

import * as init from './init';

export interface User {
    id: Generated<number>;
    name: string;
    image: string;
    created_at: Generated<Date>;
}
export interface Connection {
    user_id: number;
    provider: string;
    connection_id: string;
    token: string;
}

interface Database {
    users: User;
    connections: Connection;
}

export const db = createKysely<Database>();

// TODO - uncomment when vercel/postgres#1 is fixed
// const migrator = new Migrator({
//     db,
//     provider: {
//         async getMigrations() {
//             return { init };
//         },
//     }
// });

// migrator.migrateToLatest().then(({ error, results }) => {
//     results?.forEach((it) => {
//         if (it.status === 'Success') {
//             console.log(`migration "${it.migrationName}" was executed successfully`);
//         } else if (it.status === 'Error') {
//             console.error(`failed to execute migration "${it.migrationName}"`);
//         }
//     });

//     if (error) {
//         console.error('failed to migrate');
//         console.error(error);
//         process.exit(1);
//     }
// });
