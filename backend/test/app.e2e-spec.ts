import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';
import { UserRole } from '../src/modules/users/entities/user.entity';
import {
  TEST_PASSWORD,
  auth,
  createTestApp,
  createUserAndLogin,
  resetDatabase,
} from './utils/test-app';

describe('Health and authentication (e2e, real database)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports the database as up', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      info: { database: { status: 'up' } },
    });
  });

  it('rejects protected endpoints without a token', async () => {
    await request(app.getHttpServer()).get('/api/v1/orders').expect(401);
  });

  it('logs in with the right password and rejects the wrong one', async () => {
    const admin = await createUserAndLogin(app, UserRole.SUPER_ADMIN);
    expect(admin.token).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: `${TEST_PASSWORD}-wrong` })
      .expect(401);

    await request(app.getHttpServer())
      .get('/api/v1/orders')
      .set(auth(admin.token))
      .expect(200);
  });

  it('enforces roles: a driver cannot create customers', async () => {
    const driver = await createUserAndLogin(app, UserRole.DRIVER);
    await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(driver.token))
      .send({ name: 'Not Allowed', phone: '0780000000' })
      .expect(403);
  });
});
