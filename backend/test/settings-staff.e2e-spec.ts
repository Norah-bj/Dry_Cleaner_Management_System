import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';
import { UserRole } from '../src/modules/users/entities/user.entity';
import {
  TEST_PASSWORD,
  type TestUser,
  auth,
  createTestApp,
  createUserAndLogin,
  resetDatabase,
} from './utils/test-app';

interface UserBody {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

describe('Settings, price list and staff accounts (e2e, real database)', () => {
  let app: INestApplication<App>;
  let owner: TestUser;
  let manager: TestUser;
  let receptionist: TestUser;
  let customerId: string;

  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    owner = await createUserAndLogin(app, UserRole.SUPER_ADMIN);
    manager = await createUserAndLogin(app, UserRole.MANAGER);
    receptionist = await createUserAndLogin(app, UserRole.RECEPTIONIST);

    const customer = await http()
      .post('/api/v1/customers')
      .set(auth(receptionist.token))
      .send({ name: 'Price Check', phone: '0785555555' })
      .expect(201);
    customerId = (customer.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('first-run state', () => {
    it('ships with no prices, payment methods or time windows - only known facts', async () => {
      const res = await http()
        .get('/api/v1/settings')
        .set(auth(owner.token))
        .expect(200);
      expect(res.body).toMatchObject({
        businessName: 'EBENEZER DRY CLEANER',
        enabledPaymentMethods: [],
        timeSlots: [],
        materialCharges: {},
        allowDiscounts: false,
      });
      const items = await http()
        .get('/api/v1/catalog/items')
        .set(auth(owner.token))
        .expect(200);
      expect(items.body).toEqual([]);
    });

    it('lists what the owner still has to set up', async () => {
      const res = await http()
        .get('/api/v1/settings/setup-status')
        .set(auth(owner.token))
        .expect(200);
      const body = res.body as {
        complete: boolean;
        items: { key: string; done: boolean }[];
      };
      expect(body.complete).toBe(false);
      expect(body.items.find((i) => i.key === 'prices')?.done).toBe(false);
      expect(body.items.find((i) => i.key === 'payments')?.done).toBe(false);
    });
  });

  describe('settings', () => {
    it('lets the owner or a manager change settings, not other staff', async () => {
      await http()
        .patch('/api/v1/settings')
        .set(auth(receptionist.token))
        .send({ phone: '0788000001' })
        .expect(403);
      await http()
        .patch('/api/v1/settings')
        .set(auth(manager.token))
        .send({
          phone: '0788000001',
          whatsappNumber: '0788000001',
          enabledPaymentMethods: ['CASH'],
          timeSlots: [' 08:00-10:00 ', '14:00-16:00'],
          materialCharges: { HANGER: 0 },
          turnaround: { STANDARD: '3 days' },
        })
        .expect(200);
      const res = await http()
        .get('/api/v1/settings')
        .set(auth(receptionist.token))
        .expect(200);
      expect(res.body).toMatchObject({
        phone: '0788000001',
        enabledPaymentMethods: ['CASH'],
        timeSlots: ['08:00-10:00', '14:00-16:00'],
        materialCharges: { HANGER: 0 },
      });
    });

    it('rejects invalid values', async () => {
      await http()
        .patch('/api/v1/settings')
        .set(auth(owner.token))
        .send({ enabledPaymentMethods: ['BITCOIN'] })
        .expect(400);
      await http()
        .patch('/api/v1/settings')
        .set(auth(owner.token))
        .send({ materialCharges: { BAG: -5 } })
        .expect(400);
    });

    it('shows the customer page only public details', async () => {
      const res = await http().get('/api/v1/settings/public').expect(200);
      const body = res.body as Record<string, unknown>;
      expect(body).toMatchObject({
        phone: '0788000001',
        timeSlots: ['08:00-10:00', '14:00-16:00'],
      });
      for (const hidden of [
        'enabledPaymentMethods',
        'materialCharges',
        'discountRoles',
        'tin',
      ]) {
        expect(body).not.toHaveProperty(hidden);
      }
    });
  });

  describe('price list and server-side pricing', () => {
    let coatId: string;

    it('lets the owner add items; a duplicate name is refused; staff cannot edit prices', async () => {
      const res = await http()
        .post('/api/v1/catalog/items')
        .set(auth(owner.token))
        .send({ name: 'Coat', priceStandard: 2500, priceExpress: 4000 })
        .expect(201);
      coatId = (res.body as { id: string }).id;

      await http()
        .post('/api/v1/catalog/items')
        .set(auth(owner.token))
        .send({ name: 'Coat', priceStandard: 1 })
        .expect(409);
      await http()
        .patch(`/api/v1/catalog/items/${coatId}`)
        .set(auth(receptionist.token))
        .send({ priceStandard: 1 })
        .expect(403);
    });

    it('prices the order on the server and ignores any price sent by the client', async () => {
      await http()
        .post('/api/v1/orders')
        .set(auth(receptionist.token))
        .send({
          customerId,
          items: [{ serviceItemId: coatId, quantity: 1, unitPrice: 1 }],
        })
        .expect(400); // unitPrice is no longer an accepted field

      const res = await http()
        .post('/api/v1/orders')
        .set(auth(receptionist.token))
        .send({
          customerId,
          serviceTier: 'EXPRESS',
          items: [{ serviceItemId: coatId, quantity: 2 }],
          materials: [{ materialType: 'HANGER', quantity: 2 }],
        })
        .expect(201);
      expect(Number((res.body as { total: string }).total)).toBe(8000);
    });

    it('a later price change does not rewrite existing orders', async () => {
      await http()
        .patch(`/api/v1/catalog/items/${coatId}`)
        .set(auth(owner.token))
        .send({ priceExpress: 9999 })
        .expect(200);
      const orders = await http()
        .get('/api/v1/orders')
        .set(auth(owner.token))
        .expect(200);
      const first = (orders.body as { data: { total: string }[] }).data[0];
      expect(Number(first.total)).toBe(8000);
    });

    it('refuses a speed the item has no price for, and inactive items', async () => {
      await http()
        .post('/api/v1/orders')
        .set(auth(receptionist.token))
        .send({
          customerId,
          serviceTier: 'SAME_DAY',
          items: [{ serviceItemId: coatId, quantity: 1 }],
        })
        .expect(400);

      await http()
        .patch(`/api/v1/catalog/items/${coatId}`)
        .set(auth(owner.token))
        .send({ isActive: false })
        .expect(200);
      await http()
        .post('/api/v1/orders')
        .set(auth(receptionist.token))
        .send({ customerId, items: [{ serviceItemId: coatId, quantity: 1 }] })
        .expect(400);
      // Hidden from the active list but kept for history.
      const active = await http()
        .get('/api/v1/catalog/items')
        .set(auth(owner.token))
        .expect(200);
      expect((active.body as { id: string }[]).map((i) => i.id)).not.toContain(
        coatId,
      );
      const all = await http()
        .get('/api/v1/catalog/items?includeInactive=true')
        .set(auth(owner.token))
        .expect(200);
      expect((all.body as { id: string }[]).map((i) => i.id)).toContain(coatId);

      await http()
        .patch(`/api/v1/catalog/items/${coatId}`)
        .set(auth(owner.token))
        .send({ isActive: true })
        .expect(200);
    });

    it('applies the discount policy the owner chose', async () => {
      const order = {
        customerId,
        items: [{ serviceItemId: coatId, quantity: 1 }],
        discount: 500,
      };
      await http()
        .post('/api/v1/orders')
        .set(auth(receptionist.token))
        .send(order)
        .expect(403);

      await http()
        .patch('/api/v1/settings')
        .set(auth(owner.token))
        .send({ allowDiscounts: true, discountRoles: ['receptionist'] })
        .expect(200);
      const res = await http()
        .post('/api/v1/orders')
        .set(auth(receptionist.token))
        .send(order)
        .expect(201);
      expect(Number((res.body as { total: string }).total)).toBe(2000);
    });
  });

  describe('staff accounts', () => {
    let aline: UserBody;

    it('lets a manager create a staff login that can sign in', async () => {
      const res = await http()
        .post('/api/v1/users')
        .set(auth(manager.token))
        .send({
          fullName: 'Aline Cashier',
          email: 'Aline@Example.com',
          phone: '0786666666',
          role: 'cashier',
          password: TEST_PASSWORD,
        })
        .expect(201);
      aline = res.body as UserBody;
      expect(aline.email).toBe('aline@example.com');
      expect(aline).not.toHaveProperty('passwordHash');

      await http()
        .post('/api/v1/auth/login')
        .send({ email: 'aline@example.com', password: TEST_PASSWORD })
        .expect(200);
    });

    it('refuses duplicate emails, short passwords, and non-managers', async () => {
      await http()
        .post('/api/v1/users')
        .set(auth(manager.token))
        .send({
          fullName: 'Dup',
          email: 'ALINE@example.com',
          role: 'cashier',
          password: TEST_PASSWORD,
        })
        .expect(409);
      await http()
        .post('/api/v1/users')
        .set(auth(manager.token))
        .send({
          fullName: 'Short',
          email: 'short@example.com',
          role: 'cashier',
          password: 'abc',
        })
        .expect(400);
      await http()
        .post('/api/v1/users')
        .set(auth(receptionist.token))
        .send({
          fullName: 'X',
          email: 'x@example.com',
          role: 'cashier',
          password: TEST_PASSWORD,
        })
        .expect(403);
    });

    it('stops a manager from creating or changing Super Admins', async () => {
      await http()
        .post('/api/v1/users')
        .set(auth(manager.token))
        .send({
          fullName: 'Boss',
          email: 'boss@example.com',
          role: 'super_admin',
          password: TEST_PASSWORD,
        })
        .expect(403);
      await http()
        .patch(`/api/v1/users/${owner.id}`)
        .set(auth(manager.token))
        .send({ isActive: false })
        .expect(403);
    });

    it('a deactivated login can no longer use the system', async () => {
      const login = await http()
        .post('/api/v1/auth/login')
        .send({ email: 'aline@example.com', password: TEST_PASSWORD })
        .expect(200);
      const token = (login.body as { accessToken: string }).accessToken;

      await http()
        .patch(`/api/v1/users/${aline.id}`)
        .set(auth(manager.token))
        .send({ isActive: false })
        .expect(200);

      await http().get('/api/v1/orders').set(auth(token)).expect(401);
      await http()
        .post('/api/v1/auth/login')
        .send({ email: 'aline@example.com', password: TEST_PASSWORD })
        .expect(401);
    });

    it('resets a password', async () => {
      await http()
        .patch(`/api/v1/users/${aline.id}`)
        .set(auth(manager.token))
        .send({ isActive: true })
        .expect(200);
      await http()
        .post(`/api/v1/users/${aline.id}/reset-password`)
        .set(auth(manager.token))
        .send({ password: 'A-New-Password-9' })
        .expect(204);
      await http()
        .post('/api/v1/auth/login')
        .send({ email: 'aline@example.com', password: 'A-New-Password-9' })
        .expect(200);
    });

    it('never locks the shop out: no self-deactivation, always one Super Admin', async () => {
      await http()
        .patch(`/api/v1/users/${owner.id}`)
        .set(auth(owner.token))
        .send({ isActive: false })
        .expect(400);
      await http()
        .patch(`/api/v1/users/${owner.id}`)
        .set(auth(owner.token))
        .send({ role: 'manager' })
        .expect(400);

      const second = await http()
        .post('/api/v1/users')
        .set(auth(owner.token))
        .send({
          fullName: 'Second Owner',
          email: 'owner2@example.com',
          role: 'super_admin',
          password: TEST_PASSWORD,
        })
        .expect(201);
      const secondId = (second.body as UserBody).id;
      await http()
        .patch(`/api/v1/users/${secondId}`)
        .set(auth(owner.token))
        .send({ isActive: false })
        .expect(200);
    });

    it('lists active drivers for front-desk staff', async () => {
      await http()
        .post('/api/v1/users')
        .set(auth(manager.token))
        .send({
          fullName: 'Jean Driver',
          email: 'jean@example.com',
          role: 'driver',
          password: TEST_PASSWORD,
        })
        .expect(201);
      const res = await http()
        .get('/api/v1/users/drivers')
        .set(auth(receptionist.token))
        .expect(200);
      expect(
        (res.body as { fullName: string }[]).map((d) => d.fullName),
      ).toEqual(['Jean Driver']);
      await http()
        .get('/api/v1/users')
        .set(auth(receptionist.token))
        .expect(403);
    });
  });
});
