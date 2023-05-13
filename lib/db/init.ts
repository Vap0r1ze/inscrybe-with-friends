import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('users')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('name', 'varchar', (col) => col.notNull())
        .addColumn('image', 'varchar', (col) => col.notNull())
        .addColumn('created_at', 'timestamp', (col) =>
            col.defaultTo(sql`now()`).notNull()
        )
        .execute();

    await db.schema
        .createTable('connections')
        .addColumn('user_id', 'integer', (col) =>
            col.references('users.id').onDelete('cascade').notNull()
        )
        .addColumn('provider', 'varchar', (col) => col.notNull())
        .addColumn('connection_id', 'varchar', (col) => col.notNull())
        .addColumn('token', 'varchar', (col) => col.notNull())
        .addPrimaryKeyConstraint('connections_pk', ['user_id', 'provider'])
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('users').execute();
    await db.schema.dropTable('connections').execute();
}
