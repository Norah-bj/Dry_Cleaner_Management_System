import { DataSource } from 'typeorm';
import * as path from 'path';
import { applyE2eEnv } from './e2e-env';

function connectionOptions(database: string) {
  return {
    type: 'postgres' as const,
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database,
  };
}

/**
 * Runs once before the E2E suite: creates the E2E database if it does not
 * exist yet, then applies every migration - the same migrations production
 * uses, so schema drift between entities and migrations fails the suite.
 */
export default async function globalSetup(): Promise<void> {
  const dbName = applyE2eEnv();

  const admin = new DataSource(connectionOptions('postgres'));
  await admin.initialize();
  try {
    const exists = await admin.query<unknown[]>(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName],
    );
    if (exists.length === 0) {
      // Identifier comes from applyE2eEnv(), which only allows *_e2e / *_test.
      await admin.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await admin.destroy();
  }

  const dataSource = new DataSource({
    ...connectionOptions(dbName),
    entities: [path.resolve(__dirname, '../../src/**/*.entity.ts')],
    migrations: [path.resolve(__dirname, '../../src/database/migrations/*.ts')],
    synchronize: false,
  });
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}
