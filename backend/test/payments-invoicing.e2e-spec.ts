import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PaymentsController } from '../src/modules/payments/payments.controller';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { PaymentMethod, PaymentTxStatus } from '../src/modules/payments/entities/payment.entity';

describe('Payments & Invoicing Lifecycle (e2e)', () => {
  let app: INestApplication;

  const validOrderId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const validCustId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

  const mockPayment1 = {
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    receiptNumber: 'RCP-2026-00001',
    orderId: validOrderId,
    amount: 5000,
    paymentMethod: PaymentMethod.MOMO,
    status: PaymentTxStatus.COMPLETED,
    referenceNumber: 'MOMO-REF-987654',
    createdAt: new Date().toISOString(),
  };

  const mockPayment2 = {
    id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    receiptNumber: 'RCP-2026-00002',
    orderId: validOrderId,
    amount: 6000,
    paymentMethod: PaymentMethod.CASH,
    status: PaymentTxStatus.COMPLETED,
    referenceNumber: undefined,
    createdAt: new Date().toISOString(),
  };

  const mockInvoice = {
    id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    invoiceNumber: 'INV-2026-00001',
    orderId: validOrderId,
    customerId: validCustId,
    subtotal: 10000,
    materialCharges: 1500,
    discount: 500,
    total: 11000,
    amountPaid: 11000,
    balance: 0,
    status: 'PAID',
    createdAt: new Date().toISOString(),
  };

  let currentPaid = 0;
  const totalAmount = 11000;

  const mockPaymentsService = {
    recordPayment: jest.fn().mockImplementation((orderId: string, dto: any) => {
      currentPaid += dto.amount;
      const isSettled = currentPaid >= totalAmount;

      const payment = {
        id: `pay-${Date.now()}`,
        receiptNumber: `RCP-2026-0000${currentPaid === 5000 ? 1 : 2}`,
        orderId,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        status: PaymentTxStatus.COMPLETED,
        referenceNumber: dto.referenceNumber,
        notes: dto.notes,
        createdAt: new Date().toISOString(),
      };

      const order = {
        id: orderId,
        total: totalAmount,
        amountPaid: currentPaid,
        balance: Math.max(0, totalAmount - currentPaid),
        paymentStatus: isSettled ? 'PAID' : 'PARTIALLY_PAID',
      };

      return Promise.resolve({
        payment,
        order,
        invoice: isSettled ? mockInvoice : null,
      });
    }),
    findForOrder: jest.fn().mockResolvedValue([mockPayment1, mockPayment2]),
    findAll: jest.fn().mockResolvedValue({
      data: [mockPayment1, mockPayment2],
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    }),
    getSummary: jest.fn().mockResolvedValue({
      totalRevenue: 11000,
      totalTransactions: 2,
      byMethod: {
        CASH: 6000,
        MOMO: 5000,
        BANK_TRANSFER: 0,
        CARD: 0,
      },
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockPaymentsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. POST /orders/:orderId/payments - records partial intake payment (PARTIALLY_PAID)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/orders/${validOrderId}/payments`)
      .send({
        amount: 5000,
        paymentMethod: PaymentMethod.MOMO,
        referenceNumber: 'MOMO-REF-987654',
        notes: 'Deposit paid at intake',
      })
      .expect(201);

    expect(res.body.payment).toHaveProperty('receiptNumber');
    expect(res.body.payment.amount).toBe(5000);
    expect(res.body.order.amountPaid).toBe(5000);
    expect(res.body.order.balance).toBe(6000);
    expect(res.body.order.paymentStatus).toBe('PARTIALLY_PAID');
    expect(res.body.invoice).toBeNull();
  });

  it('2. POST /orders/:orderId/payments - settles remaining balance & triggers invoice generation (PAID)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/orders/${validOrderId}/payments`)
      .send({
        amount: 6000,
        paymentMethod: PaymentMethod.CASH,
        notes: 'Final settlement on collection',
      })
      .expect(201);

    expect(res.body.payment.amount).toBe(6000);
    expect(res.body.order.amountPaid).toBe(11000);
    expect(res.body.order.balance).toBe(0);
    expect(res.body.order.paymentStatus).toBe('PAID');
    expect(res.body.invoice).not.toBeNull();
    expect(res.body.invoice.invoiceNumber).toBe('INV-2026-00001');
  });

  it('3. GET /orders/:orderId/payments - retrieves payment receipts for an order', async () => {
    const res = await request(app.getHttpServer())
      .get(`/orders/${validOrderId}/payments`)
      .expect(200);

    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBe(2);
    expect(res.body[0].receiptNumber).toBe('RCP-2026-00001');
    expect(res.body[1].receiptNumber).toBe('RCP-2026-00002');
  });

  it('4. GET /payments - returns paginated payments ledger', async () => {
    const res = await request(app.getHttpServer())
      .get('/payments?page=1&limit=10')
      .expect(200);

    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta.total).toBe(2);
  });

  it('5. GET /payments/summary - computes aggregate revenues by payment method', async () => {
    const res = await request(app.getHttpServer())
      .get('/payments/summary')
      .expect(200);

    expect(res.body.totalRevenue).toBe(11000);
    expect(res.body.totalTransactions).toBe(2);
    expect(res.body.byMethod.MOMO).toBe(5000);
    expect(res.body.byMethod.CASH).toBe(6000);
  });
});
