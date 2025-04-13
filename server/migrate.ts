import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { log } from './vite';

// For migrations
const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 });

async function runMigrations() {
  log('Running migrations...', 'migrate');
  const db = drizzle(migrationClient);
  
  try {
    await migrate(db, { migrationsFolder: './migrations' });
    log('Migrations completed successfully', 'migrate');
  } catch (error) {
    log(`Migration failed: ${error}`, 'migrate');
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();