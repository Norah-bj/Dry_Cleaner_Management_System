import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { OrdersController } from '../src/modules/orders/orders.controller';
import { OrdersService } from '../src/modules/orders/orders.service';
import { LaundryController } from '../src/modules/laundry/laundry.controller';
import { LaundryService } from '../src/modules/laundry/laundry.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { OrderStatus, ServiceTier } from '../src/modules/orders/enums/order-enums';

describe('Orders & Laundry Lifecycle (e2e)', () => {
  let app: INestApplication;

  const validOrderId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const validCustId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

  const mockOrder = {
    id: validOrderId,
    orderNumber: 'ORD-2026-00001',
    customerId: validCustId,
    serviceTier: ServiceTier.STANDARD,
    status: OrderStatus.RECEIVED,
    subtotal: 10000,
    materialCharges: 1500,
    discount: 500,
    total: 11000,
    amountPaid: 0,
    balance: 11000,
    paymentStatus: 'UNPAID',
    items: [
      {
        id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        garmentName: 'Men Suit (2-piece)',
        quantity: 2,
        unitPrice: 5000,
        lineTotal: 10000,
      },
    ],
    materials: [
      {
        id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
        materialType: 'COVER',
        quantity: 2,
        unitCharge: 500,
        totalCharge: 1000,
      },
      {
        id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
        materialType: 'HANGER',
        quantity: 2,
        unitCharge: 250,
        totalCharge: 500,
      },
    ],
    statusHistory: [
      {
        id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
        previousStatus: null,
        newStatus: OrderStatus.RECEIVED,
        notes: 'Order intake completed',
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockOrdersService = {
    create: jest.fn().mockImplementation((dto) => {
      const subtotal = dto.items.reduce((acc: number, i: any) => acc + i.quantity * i.unitPrice, 0);
      const materialCharges = (dto.materials || []).reduce((acc: number, m: any) => acc + m.quantity * m.unitCharge, 0);
      const discount = dto.discount || 0;
      const total = subtotal + materialCharges - discount;

      return Promise.resolve({
        ...mockOrder,
        serviceTier: dto.serviceTier || ServiceTier.STANDARD,
        subtotal,
        materialCharges,
        discount,
        total,
        balance: total,
      });
    }),
    findAll: jest.fn().mockResolvedValue({
      data: [mockOrder],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    }),
    findOne: jest.fn().mockImplementation((id: string) => {
      if (id === validOrderId) return Promise.resolve(mockOrder);
      return Promise.reject(new Error('Order not found'));
    }),
    findByOrderNumber: jest.fn().mockImplementation((orderNumber: string) => {
      if (orderNumber === 'ORD-2026-00001') return Promise.resolve(mockOrder);
      return Promise.reject(new Error('Order not found'));
    }),
    updateStatus: jest.fn().mockImplementation((id: string, dto: any) => {
      return Promise.resolve({
        ...mockOrder,
        status: dto.status,
        statusHistory: [
          ...mockOrder.statusHistory,
          {
            id: `hist-${Date.now()}`,
            previousStatus: mockOrder.status,
            newStatus: dto.status,
            notes: dto.notes,
            createdAt: new Date().toISOString(),
          },
        ],
      });
    }),
  };

  const mockLaundryService = {
    getBoard: jest.fn().mockResolvedValue({
      RECEIVED: [mockOrder],
      SORTING: [],
      WASHING: [],
      DRYING: [],
      IRONING: [],
      QUALITY_CHECK: [],
      PACKING: [],
      READY: [],
    }),
    getMetrics: jest.fn().mockResolvedValue({
      totalActive: 1,
      byStage: {
        RECEIVED: 1,
        SORTING: 0,
        WASHING: 0,
        DRYING: 0,
        IRONING: 0,
        QUALITY_CHECK: 0,
        PACKING: 0,
        READY: 0,
      },
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController, LaundryController],
      providers: [
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: LaundryService, useValue: mockLaundryService },
      ],
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

  it('1. POST /orders - creates an order with garments, materials and calculates total', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .send({
        customerId: validCustId,
        serviceTier: ServiceTier.STANDARD,
        items: [
          { garmentName: 'Men Suit (2-piece)', quantity: 2, unitPrice: 5000 },
        ],
        materials: [
          { materialType: 'COVER', quantity: 2, unitCharge: 500 },
          { materialType: 'HANGER', quantity: 2, unitCharge: 250 },
        ],
        discount: 500,
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.orderNumber).toBe('ORD-2026-00001');
    expect(res.body.subtotal).toBe(10000);
    expect(res.body.materialCharges).toBe(1500);
    expect(res.body.discount).toBe(500);
    expect(res.body.total).toBe(11000);
    expect(res.body.balance).toBe(11000);
  });

  it('2. GET /orders - returns paginated orders with metadata', async () => {
    const res = await request(app.getHttpServer())
      .get('/orders?page=1&limit=10')
      .expect(200);

    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(1);
    expect(res.body.meta.total).toBe(1);
  });

  it('3. GET /orders/:id - retrieves a single order with items and materials', async () => {
    const res = await request(app.getHttpServer())
      .get(`/orders/${validOrderId}`)
      .expect(200);

    expect(res.body.id).toBe(validOrderId);
    expect(res.body.items.length).toBe(1);
    expect(res.body.materials.length).toBe(2);
  });

  it('4. PATCH /orders/:id/status - transitions through laundry stages sequentially', async () => {
    const stages = [
      OrderStatus.SORTING,
      OrderStatus.WASHING,
      OrderStatus.DRYING,
      OrderStatus.IRONING,
      OrderStatus.QUALITY_CHECK,
      OrderStatus.PACKING,
      OrderStatus.READY,
      OrderStatus.DELIVERED,
    ];

    for (const stage of stages) {
      const res = await request(app.getHttpServer())
        .patch(`/orders/${validOrderId}/status`)
        .send({ status: stage, notes: `Advanced to ${stage}` })
        .expect(200);

      expect(res.body.status).toBe(stage);
    }
  });

  it('5. GET /orders/track/:orderNumber - allows public customer tracking', async () => {
    const res = await request(app.getHttpServer())
      .get('/orders/track/ORD-2026-00001')
      .expect(200);

    expect(res.body.orderNumber).toBe('ORD-2026-00001');
    expect(res.body).toHaveProperty('status');
  });

  it('6. GET /laundry/board - returns active Kanban board columns', async () => {
    const res = await request(app.getHttpServer())
      .get('/laundry/board')
      .expect(200);

    expect(res.body).toHaveProperty('RECEIVED');
    expect(res.body).toHaveProperty('READY');
    expect(res.body.RECEIVED.length).toBe(1);
  });

  it('7. GET /laundry/metrics - returns total active orders and stage counts', async () => {
    const res = await request(app.getHttpServer())
      .get('/laundry/metrics')
      .expect(200);

    expect(res.body.totalActive).toBe(1);
    expect(res.body.byStage.RECEIVED).toBe(1);
  });
});
