import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { pool, db } from './client';
import '../env';

async function main() {
  await migrate(db, { migrationsFolder: './drizzle' });
  await pool.end();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  await pool.end();
  process.exit(1);
});

