import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Points every E2E run at a dedicated database. Loads backend/.env for the
 * connection details, then swaps the database name for E2E_DATABASE_NAME
 * (default `edcms_e2e`). The suite truncates every table before each spec
 * file, so it refuses to run against any database whose name does not end
 * in `_e2e` or `_test` - it can never wipe the dev or production database.
 */
export function applyE2eEnv(): string {
  dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

  const dbName = process.env.E2E_DATABASE_NAME ?? 'edcms_e2e';
  if (!/_(e2e|test)$/.test(dbName)) {
    throw new Error(
      `Refusing to run E2E tests against "${dbName}": the name must end in _e2e or _test.`,
    );
  }

  process.env.DATABASE_NAME = dbName;
  process.env.JWT_SECRET ??= 'e2e-only-secret-not-for-real-use';
  // Tests log in many times from one IP; security.e2e-spec turns this back on.
  process.env.RATE_LIMIT_ENABLED = 'false';
  return dbName;
}

// Jest `setupFiles` entry: runs in every test worker before the specs.
applyE2eEnv();
