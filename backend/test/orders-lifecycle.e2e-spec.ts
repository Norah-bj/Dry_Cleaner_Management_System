import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';
import { UserRole } from '../src/modules/users/entities/user.entity';
import {
  type TestUser,
  auth,
  createTestApp,
  createUserAndLogin,
  resetDatabase,
} from './utils/test-app';

interface OrderBody {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  materialCharges: string;
  total: string;
  balance: string;
  paymentStatus: string;
  createdByUserId: string | null;
  statusHistory: {
    previousStatus: string | null;
    newStatus: string;
    changedByUserId: string | null;
  }[];
}

describe('Orders and laundry workflow (e2e, real database)', () => {
  let app: INestApplication<App>;
  let receptionist: TestUser;
  let laundry: TestUser;
  let customerId: string;
  let order: OrderBody;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    receptionist = await createUserAndLogin(app, UserRole.RECEPTIONIST);
    laundry = await createUserAndLogin(app, UserRole.LAUNDRY_STAFF);

    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(receptionist.token))
      .send({ name: 'E2E Customer', phone: '0781111111', address: 'Nyamata' })
      .expect(201);
    customerId = (res.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates an order, computes totals, and records who created it', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(auth(receptionist.token))
      .send({
        customerId,
        serviceTier: 'STANDARD',
        items: [{ garmentName: 'Shirt', quantity: 2, unitPrice: 1000 }],
        materials: [
          { materialType: 'HANGER', quantity: 2, unitCharge: 100 },
          {
            materialType: 'BAG',
            quantity: 1,
            unitCharge: 500,
            customerProvided: true,
          },
        ],
      })
      .expect(201);

    order = res.body as OrderBody;
    expect(order.orderNumber).toMatch(/^ORD-\d{4}-\d{5}$/);
    expect(order.status).toBe('RECEIVED');
    expect(Number(order.subtotal)).toBe(2000);
    // Customer-provided materials are charged zero, not omitted (rule #4).
    expect(Number(order.materialCharges)).toBe(200);
    expect(Number(order.total)).toBe(2200);
    expect(Number(order.balance)).toBe(2200);
    expect(order.paymentStatus).toBe('UNPAID');
    expect(order.createdByUserId).toBe(receptionist.id);
  });

  it('rejects an order with no garments', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(auth(receptionist.token))
      .send({ customerId, items: [] })
      .expect(400);
  });

  it('logs every status change with who made it (rule #7)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)
      .set(auth(laundry.token))
      .send({ status: 'SORTING', notes: 'Sorted by colour' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}`)
      .set(auth(laundry.token))
      .expect(200);
    const body = res.body as OrderBody;

    expect(body.status).toBe('SORTING');
    expect(body.statusHistory).toHaveLength(2);
    expect(body.statusHistory[1]).toMatchObject({
      previousStatus: 'RECEIVED',
      newStatus: 'SORTING',
      changedByUserId: laundry.id,
    });
  });

  it('shows the order in its column on the laundry board', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/laundry/board')
      .set(auth(laundry.token))
      .expect(200);
    const board = res.body as { columns: Record<string, { id: string }[]> };
    expect(board.columns.SORTING.map((o) => o.id)).toContain(order.id);
    expect(board.columns.RECEIVED.map((o) => o.id)).not.toContain(order.id);
  });

  it('lets anyone track an order by its number without logging in', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/orders/track/${order.orderNumber}`)
      .expect(200);
    expect((res.body as OrderBody).status).toBe('SORTING');
  });

  it('returns 404 when tracking an unknown order number', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/orders/track/ORD-1999-99999')
      .expect(404);
  });
});
