import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';
import { DataSource } from 'typeorm';
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

interface ItemBody {
  id: string;
  name: string;
  stockQuantity: number;
  minimumStock: number | null;
  status: 'GOOD' | 'LOW' | 'OUT';
}

describe('Inventory (e2e, real database)', () => {
  let app: INestApplication<App>;
  let owner: TestUser;
  let laundry: TestUser;
  let receptionist: TestUser;
  let shop: TestShop;
  let customerId: string;
  let hangers: ItemBody;

  const http = () => request(app.getHttpServer());
  const getItem = async (id: string) =>
    (
      await http()
        .get(`/api/v1/inventory/items/${id}`)
        .set(auth(owner.token))
        .expect(200)
    ).body as ItemBody;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    owner = await createUserAndLogin(app, UserRole.SUPER_ADMIN);
    laundry = await createUserAndLogin(app, UserRole.LAUNDRY_STAFF);
    receptionist = await createUserAndLogin(app, UserRole.RECEPTIONIST);
    shop = await configureTestShop(app, owner.token); // HANGER charge is set in Settings

    const customer = await http()
      .post('/api/v1/customers')
      .set(auth(receptionist.token))
      .send({ name: 'Stock Customer', phone: '0787777777' })
      .expect(201);
    customerId = (customer.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets the owner add an item with opening stock; laundry staff can view but not change', async () => {
    const res = await http()
      .post('/api/v1/inventory/items')
      .set(auth(owner.token))
      .send({
        name: 'Hangers',
        unit: 'pcs',
        minimumStock: 3,
        openingStock: 5,
        materialType: 'HANGER',
      })
      .expect(201);
    hangers = res.body as ItemBody;
    expect(hangers).toMatchObject({ stockQuantity: 5, status: 'GOOD' });

    await http()
      .get('/api/v1/inventory/items')
      .set(auth(laundry.token))
      .expect(200);
    await http()
      .post(`/api/v1/inventory/items/${hangers.id}/transactions`)
      .set(auth(laundry.token))
      .send({ type: 'PURCHASE', quantity: 1 })
      .expect(403);
    await http()
      .get('/api/v1/inventory/items')
      .set(auth(receptionist.token))
      .expect(403);
  });

  it('refuses a duplicate name and a second item linked to the same material', async () => {
    await http()
      .post('/api/v1/inventory/items')
      .set(auth(owner.token))
      .send({ name: 'Hangers' })
      .expect(409);
    await http()
      .post('/api/v1/inventory/items')
      .set(auth(owner.token))
      .send({ name: 'Wire hangers', materialType: 'HANGER' })
      .expect(409);
  });

  it('takes hangers out of stock when an order uses them', async () => {
    await http()
      .post('/api/v1/orders')
      .set(auth(receptionist.token))
      .send({
        customerId,
        items: [{ serviceItemId: shop.shirtId, quantity: 1 }],
        materials: [
          { materialType: 'HANGER', quantity: 3 },
          { materialType: 'HANGER', quantity: 9, customerProvided: true },
        ],
      })
      .expect(201);
    const after = await getItem(hangers.id);
    expect(after.stockQuantity).toBe(2);
    expect(after.status).toBe('LOW');
  });

  it('refuses an order that needs more stock than there is, and saves nothing (rule #6)', async () => {
    const ds = app.get(DataSource);
    const countOrders = async () =>
      Number(
        (await ds.query<{ n: string }[]>('SELECT count(*) AS n FROM orders'))[0]
          .n,
      );
    const before = await countOrders();

    const res = await http()
      .post('/api/v1/orders')
      .set(auth(receptionist.token))
      .send({
        customerId,
        items: [{ serviceItemId: shop.shirtId, quantity: 1 }],
        materials: [{ materialType: 'HANGER', quantity: 5 }],
      })
      .expect(400);
    expect((res.body as { message: string }).message).toMatch(
      /Not enough Hangers/,
    );
    expect(await countOrders()).toBe(before);
    expect((await getItem(hangers.id)).stockQuantity).toBe(2);
  });

  it('records a purchase and a stock count, and never lets usage go negative', async () => {
    await http()
      .post(`/api/v1/inventory/items/${hangers.id}/transactions`)
      .set(auth(owner.token))
      .send({
        type: 'PURCHASE',
        quantity: 20,
        unitCost: 50,
        supplier: 'Kigali Supplies',
      })
      .expect(201);
    expect((await getItem(hangers.id)).stockQuantity).toBe(22);

    await http()
      .post(`/api/v1/inventory/items/${hangers.id}/transactions`)
      .set(auth(owner.token))
      .send({ type: 'ADJUSTMENT', countedQuantity: 20 })
      .expect(400); // a note is required for a count
    await http()
      .post(`/api/v1/inventory/items/${hangers.id}/transactions`)
      .set(auth(owner.token))
      .send({ type: 'ADJUSTMENT', countedQuantity: 20, notes: 'Two broken' })
      .expect(201);

    await http()
      .post(`/api/v1/inventory/items/${hangers.id}/transactions`)
      .set(auth(owner.token))
      .send({ type: 'USAGE', quantity: 21 })
      .expect(400);
    expect((await getItem(hangers.id)).stockQuantity).toBe(20);
  });

  it('keeps a full history, newest first, including order usage', async () => {
    const res = await http()
      .get(`/api/v1/inventory/transactions?itemId=${hangers.id}`)
      .set(auth(laundry.token))
      .expect(200);
    const rows = (
      res.body as {
        data: {
          type: string;
          quantityChange: number;
          quantityAfter: number;
          notes: string | null;
        }[];
      }
    ).data;
    expect(
      rows.map((r) => [r.type, r.quantityChange, r.quantityAfter]),
    ).toEqual([
      ['ADJUSTMENT', -2, 20],
      ['PURCHASE', 20, 22],
      ['USAGE', -3, 2],
      ['ADJUSTMENT', 5, 5],
    ]);
    expect(rows[2].notes).toMatch(/^Used on order ORD-/);
  });

  it('lists low-stock items and the summary counts', async () => {
    await http()
      .post('/api/v1/inventory/items')
      .set(auth(owner.token))
      .send({ name: 'Detergent', unit: 'litres', minimumStock: 5 })
      .expect(201); // opening stock 0 -> OUT
    const low = await http()
      .get('/api/v1/inventory/items?status=LOW')
      .set(auth(owner.token))
      .expect(200);
    expect((low.body as ItemBody[]).map((i) => i.name)).toEqual(['Detergent']);
    const summary = await http()
      .get('/api/v1/inventory/summary')
      .set(auth(owner.token))
      .expect(200);
    expect(summary.body).toEqual({ items: 2, low: 0, out: 1 });
  });
});
