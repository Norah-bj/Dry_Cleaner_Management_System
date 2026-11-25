import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  Order,
  OrderStatus,
  PaymentStatus,
  ServiceTier,
} from './entities/order.entity';

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepo: Record<string, jest.Mock>;
  let orderItemsRepo: Record<string, jest.Mock>;
  let orderMaterialsRepo: Record<string, jest.Mock>;
  let statusHistoryRepo: Record<string, jest.Mock>;
  let customersRepo: Record<string, jest.Mock>;
  let dataSource: Record<string, jest.Mock>;

  beforeEach(() => {
    ordersRepo = {
      create: jest.fn((val: unknown) => val),
      save: jest.fn((val: object) =>
        Promise.resolve({ id: 'order-uuid-1', ...val }),
      ),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };
    orderItemsRepo = {
      save: jest.fn(),
    };
    orderMaterialsRepo = {
      save: jest.fn(),
    };
    statusHistoryRepo = {
      save: jest.fn().mockResolvedValue({ id: 'history-1' }),
    };
    customersRepo = {
      findOne: jest.fn(),
    };
    dataSource = {
      query: jest.fn().mockResolvedValue([{ num: 1 }]),
    };

    service = new OrdersService(
      ordersRepo as never,
      orderItemsRepo as never,
      orderMaterialsRepo as never,
      statusHistoryRepo as never,
      customersRepo as never,
      dataSource as never,
    );
  });

  describe('create', () => {
    it('creates an order with calculated subtotal, materials, balance and initial history', async () => {
      customersRepo.findOne.mockResolvedValue({
        id: 'cust-1',
        name: 'Alice',
      });

      ordersRepo.findOne.mockResolvedValue({
        id: 'order-uuid-1',
        orderNumber: 'ORD-2026-00001',
        total: 5000,
        balance: 5000,
        paymentStatus: PaymentStatus.UNPAID,
        status: OrderStatus.RECEIVED,
      });

      const result = await service.create({
        customerId: 'cust-1',
        serviceTier: ServiceTier.STANDARD,
        items: [{ garmentName: 'Suit 2pc', quantity: 1, unitPrice: 5000 }],
      });

      expect(customersRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
      });
      expect(ordersRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 5000,
          total: 5000,
          balance: 5000,
          paymentStatus: PaymentStatus.UNPAID,
          status: OrderStatus.RECEIVED,
        }),
      );
      expect(statusHistoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          newStatus: OrderStatus.RECEIVED,
        }),
      );
      expect(result.id).toBe('order-uuid-1');
    });

    it('throws NotFoundException if customer does not exist', async () => {
      customersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          customerId: 'missing-cust',
          items: [{ garmentName: 'Shirt', quantity: 1, unitPrice: 1000 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if items array is empty', async () => {
      customersRepo.findOne.mockResolvedValue({ id: 'cust-1' });

      await expect(
        service.create({
          customerId: 'cust-1',
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('updates order status and logs history', async () => {
      const existing = {
        id: 'order-1',
        status: OrderStatus.RECEIVED,
      } as Order;
      ordersRepo.findOne.mockResolvedValue(existing);
      ordersRepo.save.mockImplementation((val: any) => Promise.resolve(val));

      const result = await service.updateStatus(
        'order-1',
        { status: OrderStatus.WASHING, notes: 'Started washing cycle' },
        'user-1',
      );

      expect(result.status).toBe(OrderStatus.WASHING);
      expect(statusHistoryRepo.save).toHaveBeenCalledWith({
        orderId: 'order-1',
        previousStatus: OrderStatus.RECEIVED,
        newStatus: OrderStatus.WASHING,
        notes: 'Started washing cycle',
        changedByUserId: 'user-1',
      });
    });
  });
});
