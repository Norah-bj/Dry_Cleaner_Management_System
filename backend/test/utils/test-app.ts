import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';
import { UserRole } from '../../src/modules/users/entities/user.entity';
import { UsersService } from '../../src/modules/users/users.service';

export const TEST_PASSWORD = 'Test-Password-123';

/** Boots the real AppModule against the E2E database (see setup/e2e-env.ts). */
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}

/** Empties every application table so each spec file starts clean. */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);
  const tables = await dataSource.query<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename <> 'migrations'`,
  );
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await dataSource.query(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

/** Creates a user with the given role and logs in through the real endpoint. */
export async function createUserAndLogin(
  app: INestApplication<App>,
  role: UserRole,
  email = `${role}@e2e.test`,
): Promise<TestUser> {
  const user = await app.get(UsersService).create({
    email,
    password: TEST_PASSWORD,
    fullName: `E2E ${role}`,
    role,
  });
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password: TEST_PASSWORD })
    .expect(200);
  const body = res.body as { accessToken: string };
  return { id: user.id, email, token: body.accessToken };
}

export function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
