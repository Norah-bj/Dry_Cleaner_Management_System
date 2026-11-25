import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { UserRole } from '../src/modules/users/entities/user.entity';
import {
  TEST_PASSWORD,
  type TestShop,
  type TestUser,
  auth,
  configureTestShop,
  createTestApp,
  createUserAndLogin,
  resetDatabase,
} from './utils/test-app';

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

describe('Security hardening (e2e, real database)', () => {
  let app: INestApplication<App>;
  let owner: TestUser;
  let shop: TestShop;
  const http = () => request(app.getHttpServer());

  const login = async (email: string): Promise<Tokens> =>
    (
      await http()
        .post('/api/v1/auth/login')
        .send({ email, password: TEST_PASSWORD })
        .expect(200)
    ).body as Tokens;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    owner = await createUserAndLogin(app, UserRole.SUPER_ADMIN);
    shop = await configureTestShop(app, owner.token);
  });

  afterAll(async () => {
    process.env.RATE_LIMIT_ENABLED = 'false';
    await app.close();
  });

  describe('refresh tokens', () => {
    it('rotates: a refresh token works once and returns a new pair', async () => {
      const first = await login(owner.email);
      const res = await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: first.refreshToken })
        .expect(200);
      const second = res.body as Tokens;
      expect(second.refreshToken).not.toBe(first.refreshToken);
      await http()
        .get('/api/v1/orders')
        .set(auth(second.accessToken))
        .expect(200);
    });

    it('treats replaying a used token as theft and ends that whole session', async () => {
      const first = await login(owner.email);
      const second = (
        await http()
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: first.refreshToken })
          .expect(200)
      ).body as Tokens;

      // Make the first token look "old" so it falls outside the race grace window.
      await app
        .get(DataSource)
        .query(
          `UPDATE refresh_tokens SET revoked_at = now() - interval '5 minutes' WHERE revoked_at IS NOT NULL`,
        );

      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: first.refreshToken })
        .expect(401);
      // The newer token from the same login is now revoked too.
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: second.refreshToken })
        .expect(401);
    });

    it('logout ends the session', async () => {
      const t = await login(owner.email);
      await http()
        .post('/api/v1/auth/logout')
        .send({ refreshToken: t.refreshToken })
        .expect(204);
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: t.refreshToken })
        .expect(401);
    });

    it('deactivating or resetting a password signs that person out everywhere', async () => {
      const staff = await createUserAndLogin(
        app,
        UserRole.CASHIER,
        'cashier-sec@e2e.test',
      );
      const t1 = await login(staff.email);
      await http()
        .patch(`/api/v1/users/${staff.id}`)
        .set(auth(owner.token))
        .send({ isActive: false })
        .expect(200);
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: t1.refreshToken })
        .expect(401);

      await http()
        .patch(`/api/v1/users/${staff.id}`)
        .set(auth(owner.token))
        .send({ isActive: true })
        .expect(200);
      const t2 = await login(staff.email);
      await http()
        .post(`/api/v1/users/${staff.id}/reset-password`)
        .set(auth(owner.token))
        .send({ password: 'Another-Password-1' })
        .expect(204);
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: t2.refreshToken })
        .expect(401);
    });

    it('rejects a made-up refresh token', async () => {
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'not-a-real-token' })
        .expect(401);
    });
  });

  describe('headers and error shape', () => {
    it('sends security headers', async () => {
      const res = await http().get('/health').expect(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('returns errors in the documented shape', async () => {
      const res = await http()
        .get('/api/v1/orders/track/ORD-1999-00000')
        .expect(404);
      expect(res.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: expect.any(String) as string,
        path: '/api/v1/orders/track/ORD-1999-00000',
        timestamp: expect.any(String) as string,
      });
    });
  });

  describe('audit log', () => {
    it('records payments, status changes, price and role changes, with who did it', async () => {
      const customer = await http()
        .post('/api/v1/customers')
        .set(auth(owner.token))
        .send({ name: 'Audit Customer', phone: '0788888888' })
        .expect(201);
      const order = await http()
        .post('/api/v1/orders')
        .set(auth(owner.token))
        .send({
          customerId: (customer.body as { id: string }).id,
          items: [{ serviceItemId: shop.suitId, quantity: 1 }],
        })
        .expect(201);
      const orderId = (order.body as { id: string }).id;
      await http()
        .patch(`/api/v1/orders/${orderId}/status`)
        .set(auth(owner.token))
        .send({ status: 'SORTING' })
        .expect(200);
      await http()
        .post(`/api/v1/orders/${orderId}/payments`)
        .set(auth(owner.token))
        .send({ amount: 1000, paymentMethod: 'CASH' })
        .expect(201);
      await http()
        .patch(`/api/v1/catalog/items/${shop.suitId}`)
        .set(auth(owner.token))
        .send({ priceStandard: 3500 })
        .expect(200);
      const staff = await createUserAndLogin(
        app,
        UserRole.RECEPTIONIST,
        'rec-audit@e2e.test',
      );
      await http()
        .patch(`/api/v1/users/${staff.id}`)
        .set(auth(owner.token))
        .send({ role: 'cashier' })
        .expect(200);

      const res = await http()
        .get('/api/v1/audit-logs?perPage=100')
        .set(auth(owner.token))
        .expect(200);
      const logs = (
        res.body as {
          data: { action: string; actorName: string | null; summary: string }[];
        }
      ).data;
      const actions = logs.map((l) => l.action);
      for (const a of [
        'order.created',
        'order.status_changed',
        'payment.recorded',
        'price_list.item_updated',
        'user.role_changed',
      ]) {
        expect(actions).toContain(a);
      }
      const payment = logs.find((l) => l.action === 'payment.recorded');
      expect(payment?.actorName).toBe(`E2E ${UserRole.SUPER_ADMIN}`);
      expect(payment?.summary).toMatch(/Recorded 1000 CASH on order ORD-/);
    });

    it('is visible to owner and manager only', async () => {
      const cashier = await createUserAndLogin(
        app,
        UserRole.CASHIER,
        'cash-audit@e2e.test',
      );
      await http()
        .get('/api/v1/audit-logs')
        .set(auth(cashier.token))
        .expect(403);
    });
  });

  describe('rate limits (enabled for this block)', () => {
    beforeAll(() => {
      process.env.RATE_LIMIT_ENABLED = 'true';
    });

    it('blocks password guessing after 10 login attempts a minute', async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 11; i++) {
        const res = await http()
          .post('/api/v1/auth/login')
          .send({ email: 'nobody@e2e.test', password: 'wrong' });
        statuses.push(res.status);
      }
      expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
      expect(statuses[10]).toBe(429);
    });

    it('limits public pickup requests to 5 per 10 minutes', async () => {
      const send = (i: number) =>
        http()
          .post('/api/v1/pickups/request')
          .send({
            name: `Spam ${i}`,
            phone: `07800000${10 + i}`,
            address: 'x',
            scheduledDate: '2026-12-03',
            timeSlot: '08:00-10:00',
          });
      for (let i = 0; i < 5; i++) expect((await send(i)).status).toBe(201);
      const blocked = await send(6);
      expect(blocked.status).toBe(429);
      expect((blocked.body as { statusCode: number }).statusCode).toBe(429);
    });
  });
});
