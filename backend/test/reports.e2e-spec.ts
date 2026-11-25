import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';
import { todayLocal } from '../src/modules/reports/local-time';
import { UserRole } from '../src/modules/users/entities/user.entity';
import {
  type TestShop,
  type TestUser,
  auth,
  configureTestShop,
  createTestApp,
  createUserAndLogin,
  resetDatabase,
} from './utils/test-app';

interface Summary {
  revenue: {
    total: number;
    payments: number;
    byMethod: { method: string; total: number }[];
    byDay: { day: string; total: number }[];
  };
  orders: {
    count: number;
    value: number;
    averageValue: number;
    byTier: { tier: string; count: number }[];
    topItems: { item: string; quantity: number }[];
  };
  customers: { new: number; total: number };
  outstanding: { total: number; customers: number; orders: number };
  inventory: {
    purchasesCost: number;
    topUsage: { item: string; used: number }[];
    lowStock: number;
  };
}

describe('Reports, dashboard and exports (e2e, real database)', () => {
  let app: INestApplication<App>;
  let owner: TestUser;
  let laundry: TestUser;
  let cashier: TestUser;
  let shop: TestShop;
  let readyOrderId: string;
  const today = todayLocal();
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    owner = await createUserAndLogin(app, UserRole.SUPER_ADMIN);
    laundry = await createUserAndLogin(app, UserRole.LAUNDRY_STAFF);
    cashier = await createUserAndLogin(app, UserRole.CASHIER);
    shop = await configureTestShop(app, owner.token); // Shirt 1000/1500, Suit 3000; HANGER 100; CASH, MOMO

    const mkCustomer = async (name: string, phone: string) =>
      (
        (
          await http()
            .post('/api/v1/customers')
            .set(auth(owner.token))
            .send({ name, phone })
            .expect(201)
        ).body as { id: string }
      ).id;
    const c1 = await mkCustomer('Report One', '0781000001');
    const c2 = await mkCustomer('=HYPERLINK("x")', '0781000002'); // CSV-injection attempt

    // Order A: 2 express shirts (3000) + 2 hangers (200) = 3200, paid 1000 cash + 2200 momo -> PAID
    const a = await http()
      .post('/api/v1/orders')
      .set(auth(owner.token))
      .send({
        customerId: c1,
        serviceTier: 'EXPRESS',
        items: [{ serviceItemId: shop.shirtId, quantity: 2 }],
        materials: [{ materialType: 'HANGER', quantity: 2 }],
      })
      .expect(201);
    const aId = (a.body as { id: string }).id;
    await http()
      .post(`/api/v1/orders/${aId}/payments`)
      .set(auth(owner.token))
      .send({ amount: 1000, paymentMethod: 'CASH' })
      .expect(201);
    await http()
      .post(`/api/v1/orders/${aId}/payments`)
      .set(auth(owner.token))
      .send({ amount: 2200, paymentMethod: 'MOMO' })
      .expect(201);

    // Order B: 1 suit (3000), unpaid, moved to READY
    const b = await http()
      .post('/api/v1/orders')
      .set(auth(owner.token))
      .send({
        customerId: c2,
        items: [{ serviceItemId: shop.suitId, quantity: 1 }],
      })
      .expect(201);
    readyOrderId = (b.body as { id: string }).id;
    await http()
      .patch(`/api/v1/orders/${readyOrderId}/status`)
      .set(auth(owner.token))
      .send({ status: 'READY' })
      .expect(200);

    // Stock: hangers bought for 50 each, then used by an order
    const item = await http()
      .post('/api/v1/inventory/items')
      .set(auth(owner.token))
      .send({
        name: 'Hangers',
        minimumStock: 10,
        openingStock: 0,
        materialType: 'COVER',
      })
      .expect(201);
    await http()
      .post(
        `/api/v1/inventory/items/${(item.body as { id: string }).id}/transactions`,
      )
      .set(auth(owner.token))
      .send({ type: 'PURCHASE', quantity: 20, unitCost: 50 })
      .expect(201);
    await http()
      .post('/api/v1/orders')
      .set(auth(owner.token))
      .send({
        customerId: c1,
        items: [{ serviceItemId: shop.shirtId, quantity: 1 }],
        materials: [{ materialType: 'COVER', quantity: 4 }],
      })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it("totals today's revenue, orders, outstanding and stock from the real records", async () => {
    const res = await http()
      .get(`/api/v1/reports/summary?from=${today}&to=${today}`)
      .set(auth(owner.token))
      .expect(200);
    const s = res.body as Summary;
    expect(s.revenue.total).toBe(3200);
    expect(s.revenue.payments).toBe(2);
    expect(
      Object.fromEntries(s.revenue.byMethod.map((m) => [m.method, m.total])),
    ).toEqual({ MOMO: 2200, CASH: 1000 });
    expect(s.revenue.byDay).toEqual([{ day: today, total: 3200 }]);
    // 3200 + 3000 + (1000 + 4 covers x 300 = 2200) = 8400 over 3 orders
    expect(s.orders.count).toBe(3);
    expect(s.orders.value).toBe(8400);
    expect(s.orders.averageValue).toBe(2800);
    expect(s.orders.topItems[0]).toEqual({
      item: 'Shirt',
      quantity: 3,
      value: 4000,
    });
    expect(s.customers).toEqual({ new: 2, total: 2 });
    expect(s.outstanding).toEqual({ total: 5200, customers: 2, orders: 2 });
    expect(s.inventory.purchasesCost).toBe(1000);
    expect(s.inventory.topUsage).toEqual([
      { item: 'Hangers', unit: 'pcs', used: 4 },
    ]);
    expect(s.inventory.lowStock).toBe(0);
  });

  it('fills days with no sales with zero, and rejects bad ranges', async () => {
    const res = await http()
      .get('/api/v1/reports/summary?from=2026-01-01&to=2026-01-03')
      .set(auth(owner.token))
      .expect(200);
    expect((res.body as Summary).revenue.byDay.map((d) => d.total)).toEqual([
      0, 0, 0,
    ]);
    await http()
      .get('/api/v1/reports/summary?from=2026-02-01&to=2026-01-01')
      .set(auth(owner.token))
      .expect(400);
    await http()
      .get('/api/v1/reports/summary?from=2020-01-01&to=2026-01-01')
      .set(auth(owner.token))
      .expect(400);
    await http()
      .get('/api/v1/reports/summary?from=yesterday')
      .set(auth(owner.token))
      .expect(400);
  });

  it('exports CSV that opens in Excel and cannot run formulas', async () => {
    const res = await http()
      .get(`/api/v1/reports/export/orders?from=${today}&to=${today}`)
      .set(auth(owner.token))
      .expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(
      /attachment; filename="edcms-orders-/,
    );
    const text = res.text;
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const lines = text.trim().split('\r\n');
    expect(lines).toHaveLength(4); // header + 3 orders
    expect(lines[0]).toContain('Customer no.');
    expect(text).toContain(`"'=HYPERLINK(""x"")"`);

    for (const dataset of ['payments', 'customers', 'inventory']) {
      await http()
        .get(`/api/v1/reports/export/${dataset}?from=${today}&to=${today}`)
        .set(auth(owner.token))
        .expect(200);
    }
    await http()
      .get('/api/v1/reports/export/passwords')
      .set(auth(owner.token))
      .expect(400);
  });

  it('reports are for owner and manager only', async () => {
    await http()
      .get('/api/v1/reports/summary')
      .set(auth(cashier.token))
      .expect(403);
    await http()
      .get('/api/v1/reports/export/payments')
      .set(auth(laundry.token))
      .expect(403);
  });

  it("shows today's dashboard, hiding money from laundry staff", async () => {
    const res = await http()
      .get('/api/v1/dashboard/summary')
      .set(auth(cashier.token))
      .expect(200);
    const d = res.body as Record<string, unknown> & {
      stageCounts: Record<string, number>;
      needsAttention: { orderId: string; reason: string; unpaid: boolean }[];
      revenueLast7Days: { total: number }[];
    };
    expect(d).toMatchObject({
      todayOrders: 3,
      ready: 1,
      readyUnpaid: 1,
      todayRevenue: 3200,
      outstanding: 5200,
      owingCustomers: 2,
    });
    expect(d.stageCounts.READY).toBe(1);
    expect(d.stageCounts.RECEIVED).toBe(2);
    expect(d.needsAttention).toContainEqual(
      expect.objectContaining({
        orderId: readyOrderId,
        reason: 'READY',
        unpaid: true,
      }),
    );
    expect(d.revenueLast7Days).toHaveLength(7);
    expect(d.revenueLast7Days[6].total).toBe(3200);

    const forLaundry = (
      await http()
        .get('/api/v1/dashboard/summary')
        .set(auth(laundry.token))
        .expect(200)
    ).body as Record<string, unknown>;
    expect(forLaundry).toMatchObject({
      todayOrders: 3,
      todayRevenue: null,
      outstanding: null,
      revenueLast7Days: null,
    });
  });

  it('flags orders that are past their ready time', async () => {
    const customer = await http()
      .post('/api/v1/customers')
      .set(auth(owner.token))
      .send({ name: 'Late', phone: '0781000009' })
      .expect(201);
    const late = await http()
      .post('/api/v1/orders')
      .set(auth(owner.token))
      .send({
        customerId: (customer.body as { id: string }).id,
        items: [{ serviceItemId: shop.suitId, quantity: 1 }],
        expectedCompletion: new Date(Date.now() - 3_600_000).toISOString(),
      })
      .expect(201);
    const d = (
      await http()
        .get('/api/v1/dashboard/summary')
        .set(auth(owner.token))
        .expect(200)
    ).body as { needsAttention: { orderId: string; reason: string }[] };
    expect(d.needsAttention[0]).toMatchObject({
      orderId: (late.body as { id: string }).id,
      reason: 'OVERDUE',
    });
  });

  it('reports EBM as not configured (no invented integration)', async () => {
    const res = await http()
      .get('/api/v1/ebm/status')
      .set(auth(owner.token))
      .expect(200);
    expect(res.body).toMatchObject({ configured: false });
  });
});
