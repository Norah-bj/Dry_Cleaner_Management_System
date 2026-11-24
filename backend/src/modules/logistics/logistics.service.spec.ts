import { NotFoundException } from '@nestjs/common';
import { LogisticsService } from './logistics.service';
import { PickupStatus } from './entities/pickup-request.entity';
import { DeliveryStatus } from './entities/delivery-request.entity';

describe('LogisticsService', () => {
  let service: LogisticsService;
  let pickupsRepo: Record<string, jest.Mock>;
  let deliveriesRepo: Record<string, jest.Mock>;
  let customersRepo: Record<string, jest.Mock>;
  let ordersRepo: Record<string, jest.Mock>;
  let dataSource: Record<string, jest.Mock>;

  beforeEach(() => {
    pickupsRepo = {
      create: jest.fn((val: unknown) => val),
      save: jest.fn((val: object) => Promise.resolve({ id: 'pkp-1', ...val })),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };
    deliveriesRepo = {
      create: jest.fn((val: unknown) => val),
      save: jest.fn((val: object) => Promise.resolve({ id: 'dlv-1', ...val })),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };
    customersRepo = {
      findOne: jest.fn(),
    };
    ordersRepo = {
      findOne: jest.fn(),
    };
    dataSource = {
      query: jest.fn().mockResolvedValue([{ num: 1 }]),
    };

    service = new LogisticsService(
      pickupsRepo as never,
      deliveriesRepo as never,
      customersRepo as never,
      ordersRepo as never,
      dataSource as never,
      { create: jest.fn() } as never,
    );
  });

  describe('createPickup', () => {
    it('creates pickup with generated number and requested status', async () => {
      customersRepo.findOne.mockResolvedValue({ id: 'cust-1' });

      const result = await service.createPickup({
        customerId: 'cust-1',
        pickupAddress: 'Nyamata Sector',
        scheduledDate: '2026-09-15',
      });

      expect(pickupsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pickupNumber: 'PKP-2026-00001',
          pickupAddress: 'Nyamata Sector',
          status: PickupStatus.REQUESTED,
        }),
      );
      expect(result.id).toBe('pkp-1');
    });

    it('throws NotFoundException if customer not found', async () => {
      customersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createPickup({
          customerId: 'missing-cust',
          pickupAddress: 'Nyamata',
          scheduledDate: '2026-09-15',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createDelivery', () => {
    it('creates delivery with collectable amount defaulting to order balance', async () => {
      ordersRepo.findOne.mockResolvedValue({
        id: 'order-1',
        balance: 3500,
      });

      const result = await service.createDelivery({
        orderId: 'order-1',
        deliveryAddress: 'Nyamata Hospital Rd',
        scheduledDate: '2026-09-16',
      });

      expect(deliveriesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryNumber: 'DLV-2026-00001',
          amountCollectable: 3500,
          status: DeliveryStatus.SCHEDULED,
        }),
      );
      expect(result.id).toBe('dlv-1');
    });
  });

  describe('getDriverTasks', () => {
    it('returns pickups, deliveries, and active count for the given driver', async () => {
      pickupsRepo.find.mockResolvedValue([
        { id: 'p1', status: PickupStatus.SCHEDULED },
        { id: 'p2', status: PickupStatus.PICKED_UP },
      ]);
      deliveriesRepo.find.mockResolvedValue([
        { id: 'd1', status: DeliveryStatus.OUT_FOR_DELIVERY },
      ]);

      const tasks = await service.getDriverTasks('DRV-001');

      expect(tasks.driverId).toBe('DRV-001');
      expect(tasks.activePickupsCount).toBe(1);
      expect(tasks.activeDeliveriesCount).toBe(1);
    });
  });
});
