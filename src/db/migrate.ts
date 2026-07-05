// ponytail: drizzle-kit's `migrate` CLI hangs indefinitely with no error on
// some Postgres setups (https://github.com/drizzle-team/drizzle-orm/issues/5622,
// open as of drizzle-kit@0.31.10). Running the ORM's migrator directly avoids
// the CLI and fails fast/loudly instead of spinning forever. Revisit once
// upstream fixes the CLI.
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

await migrate(db, { migrationsFolder: './drizzle' });
console.log('Migrations applied');
await client.end();
