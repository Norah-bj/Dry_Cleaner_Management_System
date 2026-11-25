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

interface PickupBody {
  id: string;
  pickupNumber: string;
  status: string;
  timeSlot: string | null;
  assignedDriverId: string | null;
}

interface DeliveryBody {
  id: string;
  deliveryNumber: string;
  status: string;
}

describe('Pickups, deliveries and driver tasks (e2e, real database)', () => {
  let app: INestApplication<App>;
  let receptionist: TestUser;
  let driver: TestUser;
  let customerId: string;
  let orderId: string;
  let pickup: PickupBody;
  let delivery: DeliveryBody;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    receptionist = await createUserAndLogin(app, UserRole.RECEPTIONIST);
    driver = await createUserAndLogin(app, UserRole.DRIVER);

    const customer = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(receptionist.token))
      .send({ name: 'Delivery Customer', phone: '0783333333' })
      .expect(201);
    customerId = (customer.body as { id: string }).id;

    const order = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(auth(receptionist.token))
      .send({
        customerId,
        items: [{ garmentName: 'Blanket', quantity: 1, unitPrice: 4000 }],
      })
      .expect(201);
    orderId = (order.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('schedules a pickup with a date and time window (rule #3)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/pickups')
      .set(auth(receptionist.token))
      .send({
        customerId,
        pickupAddress: 'Nyamata, near the market',
        scheduledDate: '2026-12-01',
        timeSlot: '14:00-16:00',
      })
      .expect(201);
    pickup = res.body as PickupBody;
    expect(pickup.pickupNumber).toMatch(/^PKP-\d{4}-\d{5}$/);
    expect(pickup.timeSlot).toBe('14:00-16:00');
  });

  it('does not let the public create pickups for an existing customer id', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/pickups')
      .send({
        customerId,
        pickupAddress: 'Anywhere',
        scheduledDate: '2026-12-01',
      })
      .expect(401);
  });

  it('accepts a public pickup request and reuses the customer with that phone', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/pickups/request')
      .send({
        name: 'Delivery Customer',
        phone: '0783 333 333',
        address: 'Nyamata, near the market',
        scheduledDate: '2026-12-03',
        timeSlot: '08:00-10:00',
      })
      .expect(201);
    const body = res.body as Record<string, unknown>;
    // Only reference details come back - no customer record.
    expect(Object.keys(body).sort()).toEqual([
      'pickupNumber',
      'scheduledDate',
      'timeSlot',
    ]);

    const customers = await request(app.getHttpServer())
      .get('/api/v1/customers?search=0783333333')
      .set(auth(receptionist.token))
      .expect(200);
    expect((customers.body as { data: unknown[] }).data).toHaveLength(1);
  });

  it('registers a new customer from a public request with a new phone', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/pickups/request')
      .send({
        name: 'Brand New',
        phone: '0789999999',
        address: 'Kigali road',
        scheduledDate: '2026-12-03',
      })
      .expect(201);

    const customers = await request(app.getHttpServer())
      .get('/api/v1/customers?search=0789999999')
      .set(auth(receptionist.token))
      .expect(200);
    const data = (customers.body as { data: { name: string }[] }).data;
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Brand New');
  });

  it('rejects a public request with an invalid phone', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/pickups/request')
      .send({
        name: 'X',
        phone: 'not-a-phone',
        address: 'Y',
        scheduledDate: '2026-12-03',
      })
      .expect(400);
  });

  it('assigns the pickup to a driver and moves it along', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/pickups/${pickup.id}`)
      .set(auth(receptionist.token))
      .send({
        assignedDriverId: driver.id,
        assignedDriverName: 'E2E driver',
        status: 'DRIVER_ASSIGNED',
      })
      .expect(200);
    expect(res.body as PickupBody).toMatchObject({
      status: 'DRIVER_ASSIGNED',
      assignedDriverId: driver.id,
    });
  });

  it('schedules a delivery for the order and assigns the same driver', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/deliveries')
      .set(auth(receptionist.token))
      .send({
        orderId,
        deliveryAddress: 'Nyamata, near the market',
        scheduledDate: '2026-12-02',
        timeSlot: '10:00-12:00',
        assignedDriverId: driver.id,
        assignedDriverName: 'E2E driver',
      })
      .expect(201);
    delivery = res.body as DeliveryBody;
    expect(delivery.deliveryNumber).toMatch(/^DLV-\d{4}-\d{5}$/);
  });

  it('shows the driver their active pickups and deliveries', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/drivers/${driver.id}/tasks`)
      .set(auth(driver.token))
      .expect(200);
    const tasks = res.body as {
      pickups: PickupBody[];
      deliveries: DeliveryBody[];
      activePickupsCount: number;
      activeDeliveriesCount: number;
    };
    expect(tasks.pickups.map((p) => p.id)).toEqual([pickup.id]);
    expect(tasks.deliveries.map((d) => d.id)).toEqual([delivery.id]);
    expect(tasks.activePickupsCount).toBe(1);
    expect(tasks.activeDeliveriesCount).toBe(1);
  });

  it('marks the delivery delivered', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/deliveries/${delivery.id}`)
      .set(auth(driver.token))
      .send({ status: 'DELIVERED' })
      .expect(200);
    expect((res.body as DeliveryBody).status).toBe('DELIVERED');
  });
});
