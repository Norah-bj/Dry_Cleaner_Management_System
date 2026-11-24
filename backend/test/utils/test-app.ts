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

/**
 * Test-only shop setup, done through the real Settings and price-list
 * endpoints the way the owner would. The numbers are TEST FIXTURES, not
 * the client's prices.
 */
export const TEST_SLOTS = ['08:00-10:00', '14:00-16:00'];

export interface TestShop {
  shirtId: string; // Standard 1000, Express 1500, no Same-Day price
  suitId: string; // Standard 3000
  blanketId: string; // Standard 4000
}

export async function configureTestShop(
  app: INestApplication<App>,
  ownerToken: string,
): Promise<TestShop> {
  const server = app.getHttpServer();
  await request(server)
    .patch('/api/v1/settings')
    .set(auth(ownerToken))
    .send({
      enabledPaymentMethods: ['CASH', 'MOMO'],
      materialCharges: { HANGER: 100, COVER: 300 },
      timeSlots: TEST_SLOTS,
    })
    .expect(200);

  const add = async (body: Record<string, unknown>) => {
    const res = await request(server)
      .post('/api/v1/catalog/items')
      .set(auth(ownerToken))
      .send(body)
      .expect(201);
    return (res.body as { id: string }).id;
  };
  return {
    shirtId: await add({
      name: 'Shirt',
      priceStandard: 1000,
      priceExpress: 1500,
    }),
    suitId: await add({ name: 'Suit', priceStandard: 3000 }),
    blanketId: await add({ name: 'Blanket', priceStandard: 4000 }),
  };
}
