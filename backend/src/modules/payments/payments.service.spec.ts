import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentMethod } from './entities/payment.entity';
import { Order, PaymentStatus } from '../orders/entities/order.entity';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentsRepo: any;
  let invoicesRepo: any;
  let ordersRepo: any;
  let dataSource: any;

  beforeEach(() => {
    paymentsRepo = {
      create: jest.fn((val: unknown) => val),
      save: jest.fn((val: Record<string, unknown>) =>
        Promise.resolve({ id: 'pay-1', ...val }),
      ),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };
    invoicesRepo = {
      create: jest.fn((val: unknown) => val),
      save: jest.fn((val: Record<string, unknown>) =>
        Promise.resolve({ id: 'inv-1', ...val }),
      ),
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    };
    ordersRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    dataSource = {
      query: jest.fn().mockResolvedValue([{ num: 1 }]),
      transaction: jest.fn(
        (
          cb: (manager: {
            findOne: jest.Mock;
            create: jest.Mock;
            save: jest.Mock;
          }) => Promise<unknown>,
        ) =>
          cb({
            findOne: jest.fn(),
            create: jest.fn((_cls: unknown, val: unknown) => val),
            save: jest.fn((_cls: unknown, val: Record<string, unknown>) =>
              Promise.resolve({ id: 'saved-id', ...val }),
            ),
          }),
      ),
    };

    service = new PaymentsService(
      paymentsRepo,
      invoicesRepo,
      ordersRepo,
      dataSource,
    );
  });

  describe('recordPayment', () => {
    it('records payment, updates amountPaid & balance, sets PAID when balance reaches 0', async () => {
      const mockOrder = {
        id: 'order-1',
        total: 5000,
        amountPaid: 0,
        balance: 5000,
        paymentStatus: PaymentStatus.UNPAID,
      } as Order;

      const mockEntityManager = {
        findOne: jest.fn().mockImplementation((entity) => {
          if (entity === Order) return Promise.resolve(mockOrder);
          return Promise.resolve(null);
        }),
        create: jest.fn((_cls: unknown, val: unknown) => val),
        save: jest.fn((_cls: unknown, val: Record<string, unknown>) =>
          Promise.resolve({ id: 'id-1', ...val }),
        ),
      };

      dataSource.transaction.mockImplementation(
        (cb: (m: typeof mockEntityManager) => Promise<unknown>) =>
          cb(mockEntityManager),
      );

      const payment = await service.recordPayment(
        'order-1',
        {
          amount: 5000,
          paymentMethod: PaymentMethod.MOMO,
          referenceNumber: 'MOMO-1234',
        },
        'user-1',
      );

      expect(payment.amount).toBe(5000);
      expect(payment.paymentMethod).toBe(PaymentMethod.MOMO);
      expect(mockOrder.amountPaid).toBe(5000);
      expect(mockOrder.balance).toBe(0);
      expect(mockOrder.paymentStatus).toBe(PaymentStatus.PAID);
    });

    it('throws NotFoundException when order not found', async () => {
      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValue(null),
      };
      dataSource.transaction.mockImplementation(
        (cb: (m: typeof mockEntityManager) => Promise<unknown>) =>
          cb(mockEntityManager),
      );

      await expect(
        service.recordPayment('missing-order', {
          amount: 1000,
          paymentMethod: PaymentMethod.CASH,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when order is already fully paid', async () => {
      const mockOrder = {
        id: 'order-1',
        total: 5000,
        amountPaid: 5000,
        balance: 0,
        paymentStatus: PaymentStatus.PAID,
      } as Order;

      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValue(mockOrder),
      };
      dataSource.transaction.mockImplementation(
        (cb: (m: typeof mockEntityManager) => Promise<unknown>) =>
          cb(mockEntityManager),
      );

      await expect(
        service.recordPayment('order-1', {
          amount: 1000,
          paymentMethod: PaymentMethod.CASH,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
