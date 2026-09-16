import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PickupsController } from '../src/modules/logistics/pickups.controller';
import { DeliveriesController } from '../src/modules/logistics/deliveries.controller';
import { DriversController } from '../src/modules/logistics/drivers.controller';
import { LogisticsService } from '../src/modules/logistics/logistics.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { PickupStatus } from '../src/modules/logistics/entities/pickup-request.entity';
import { DeliveryStatus } from '../src/modules/logistics/entities/delivery-request.entity';

describe('Logistics & Driver Tasks Lifecycle (e2e)', () => {
  let app: INestApplication;

  const validPickupId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const validDeliveryId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
  const validCustId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  const validOrderId = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
  const validDriverId = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';

  const mockPickup = {
    id: validPickupId,
    pickupNumber: 'PKP-2026-00001',
    customerId: validCustId,
    pickupAddress: 'Nyamata Sector, Street 12',
    scheduledDate: '2026-09-16',
    timeSlot: '14:00 - 16:00',
    status: PickupStatus.REQUESTED,
    assignedDriverId: validDriverId,
    assignedDriverName: 'Eric Niyonzima',
    notes: 'Fragile wedding garments',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockDelivery = {
    id: validDeliveryId,
    deliveryNumber: 'DLV-2026-00001',
    orderId: validOrderId,
    deliveryAddress: 'Nyamata Sector, Street 12',
    scheduledDate: '2026-09-17',
    timeSlot: '10:00 - 12:00',
    amountCollectable: 6000,
    status: DeliveryStatus.SCHEDULED,
    assignedDriverId: validDriverId,
    assignedDriverName: 'Eric Niyonzima',
    notes: 'Call on arrival',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockLogisticsService = {
    createPickup: jest.fn().mockImplementation((dto) => {
      return Promise.resolve({
        ...mockPickup,
        ...dto,
        id: validPickupId,
        pickupNumber: 'PKP-2026-00001',
        status: PickupStatus.REQUESTED,
      });
    }),
    findAllPickups: jest.fn().mockResolvedValue({
      data: [mockPickup],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    }),
    updatePickup: jest.fn().mockImplementation((id: string, dto: any) => {
      return Promise.resolve({
        ...mockPickup,
        ...dto,
      });
    }),
    createDelivery: jest.fn().mockImplementation((dto) => {
      return Promise.resolve({
        ...mockDelivery,
        ...dto,
        id: validDeliveryId,
        deliveryNumber: 'DLV-2026-00001',
        status: DeliveryStatus.SCHEDULED,
      });
    }),
    findAllDeliveries: jest.fn().mockResolvedValue({
      data: [mockDelivery],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    }),
    updateDelivery: jest.fn().mockImplementation((id: string, dto: any) => {
      return Promise.resolve({
        ...mockDelivery,
        ...dto,
      });
    }),
    getDriverTasks: jest.fn().mockImplementation((driverId: string) => {
      return Promise.resolve({
        driverId,
        pickups: [mockPickup],
        deliveries: [mockDelivery],
      });
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PickupsController, DeliveriesController, DriversController],
      providers: [{ provide: LogisticsService, useValue: mockLogisticsService }],
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

  it('1. POST /pickups - schedules a customer pickup request', async () => {
    const res = await request(app.getHttpServer())
      .post('/pickups')
      .send({
        customerId: validCustId,
        pickupAddress: 'Nyamata Sector, Street 12',
        scheduledDate: '2026-09-16',
        timeSlot: '14:00 - 16:00',
        notes: 'Fragile wedding garments',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.pickupNumber).toBe('PKP-2026-00001');
    expect(res.body.status).toBe(PickupStatus.REQUESTED);
  });

  it('2. GET /pickups - retrieves active pickups list', async () => {
    const res = await request(app.getHttpServer())
      .get('/pickups?page=1&limit=10')
      .expect(200);

    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(1);
    expect(res.body.meta.total).toBe(1);
  });

  it('3. PATCH /pickups/:id - progresses pickup dispatch lifecycle', async () => {
    const statuses = [
      PickupStatus.SCHEDULED,
      PickupStatus.DRIVER_ASSIGNED,
      PickupStatus.ON_THE_WAY,
      PickupStatus.PICKED_UP,
    ];

    for (const status of statuses) {
      const res = await request(app.getHttpServer())
        .patch(`/pickups/${validPickupId}`)
        .send({ status, assignedDriverId: validDriverId, assignedDriverName: 'Eric Niyonzima' })
        .expect(200);

      expect(res.body.status).toBe(status);
    }
  });

  it('4. POST /deliveries - schedules an order delivery with balance due', async () => {
    const res = await request(app.getHttpServer())
      .post('/deliveries')
      .send({
        orderId: validOrderId,
        deliveryAddress: 'Nyamata Sector, Street 12',
        scheduledDate: '2026-09-17',
        timeSlot: '10:00 - 12:00',
        amountCollectable: 6000,
        notes: 'Call on arrival',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.deliveryNumber).toBe('DLV-2026-00001');
    expect(res.body.amountCollectable).toBe(6000);
    expect(res.body.status).toBe(DeliveryStatus.SCHEDULED);
  });

  it('5. PATCH /deliveries/:id - progresses delivery dispatch to DELIVERED', async () => {
    const statuses = [
      DeliveryStatus.DRIVER_ASSIGNED,
      DeliveryStatus.OUT_FOR_DELIVERY,
      DeliveryStatus.DELIVERED,
    ];

    for (const status of statuses) {
      const res = await request(app.getHttpServer())
        .patch(`/deliveries/${validDeliveryId}`)
        .send({ status })
        .expect(200);

      expect(res.body.status).toBe(status);
    }
  });

  it('6. GET /drivers/:driverId/tasks - aggregates pickups and deliveries for driver mobile view', async () => {
    const res = await request(app.getHttpServer())
      .get(`/drivers/${validDriverId}/tasks`)
      .expect(200);

    expect(res.body.driverId).toBe(validDriverId);
    expect(res.body.pickups.length).toBe(1);
    expect(res.body.deliveries.length).toBe(1);
    expect(res.body.pickups[0].pickupNumber).toBe('PKP-2026-00001');
    expect(res.body.deliveries[0].deliveryNumber).toBe('DLV-2026-00001');
  });
});
