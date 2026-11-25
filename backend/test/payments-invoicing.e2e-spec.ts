import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types';
import { DataSource } from 'typeorm';
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
  total: string;
  amountPaid: string;
  balance: string;
  paymentStatus: string;
}

interface PaymentBody {
  receiptNumber: string;
  amount: string;
  receivedByUserId: string | null;
}

describe('Payments and invoicing (e2e, real database)', () => {
  let app: INestApplication<App>;
  let cashier: TestUser;
  let orderId: string;

  async function getOrder(): Promise<OrderBody> {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}`)
      .set(auth(cashier.token))
      .expect(200);
    return res.body as OrderBody;
  }

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    cashier = await createUserAndLogin(app, UserRole.CASHIER);

    const customer = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(cashier.token))
      .send({ name: 'Paying Customer', phone: '0782222222' })
      .expect(201);

    const order = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(auth(cashier.token))
      .send({
        customerId: (customer.body as { id: string }).id,
        items: [{ garmentName: 'Suit', quantity: 1, unitPrice: 3000 }],
      })
      .expect(201);
    orderId = (order.body as OrderBody).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('records a partial payment and keeps a running balance (rule #5)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/payments`)
      .set(auth(cashier.token))
      .send({ amount: 1000, paymentMethod: 'CASH' })
      .expect(201);
    const payment = res.body as PaymentBody;

    expect(payment.receiptNumber).toMatch(/^RCP-\d{4}-\d{5}$/);
    expect(payment.receivedByUserId).toBe(cashier.id);

    const order = await getOrder();
    expect(Number(order.amountPaid)).toBe(1000);
    expect(Number(order.balance)).toBe(2000);
    expect(order.paymentStatus).toBe('PARTIALLY_PAID');
  });

  it('settles the balance, marks the order PAID, and writes one invoice', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/payments`)
      .set(auth(cashier.token))
      .send({ amount: 2000, paymentMethod: 'MOMO', referenceNumber: 'MM-1' })
      .expect(201);

    const order = await getOrder();
    expect(Number(order.balance)).toBe(0);
    expect(order.paymentStatus).toBe('PAID');

    const invoices = await app
      .get(DataSource)
      .query<
        { invoice_number: string; total_amount: string; status: string }[]
      >(
        'SELECT invoice_number, total_amount, status FROM invoices WHERE order_id = $1',
        [orderId],
      );
    expect(invoices).toHaveLength(1);
    expect(invoices[0].invoice_number).toMatch(/^INV-\d{4}-\d{5}$/);
    expect(Number(invoices[0].total_amount)).toBe(3000);
    expect(invoices[0].status).toBe('PAID');
  });

  it('refuses further payments on a fully paid order', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/orders/${orderId}/payments`)
      .set(auth(cashier.token))
      .send({ amount: 500, paymentMethod: 'CASH' })
      .expect(400);
  });

  it("lists the order's payments and includes them in today's summary", async () => {
    const list = await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}/payments`)
      .set(auth(cashier.token))
      .expect(200);
    expect(list.body as PaymentBody[]).toHaveLength(2);

    const summary = await request(app.getHttpServer())
      .get('/api/v1/payments/summary')
      .set(auth(cashier.token))
      .expect(200);
    expect(summary.body).toMatchObject({
      todayTotal: 3000,
      methodBreakdown: { CASH: 1000, MOMO: 2000 },
      totalOutstanding: 0,
    });
  });
});
