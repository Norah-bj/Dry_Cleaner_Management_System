import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  Order,
  OrderStatus,
  PaymentStatus,
  ServiceTier,
} from './entities/order.entity';
import { MaterialType } from './entities/order-material.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { UserRole } from '../users/entities/user.entity';

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepo: Record<string, jest.Mock>;
  let orderItemsRepo: Record<string, jest.Mock>;
  let orderMaterialsRepo: Record<string, jest.Mock>;
  let statusHistoryRepo: Record<string, jest.Mock>;
  let customersRepo: Record<string, jest.Mock>;
  let dataSource: Record<string, jest.Mock>;
  let catalogService: Record<string, jest.Mock>;
  let settingsService: Record<string, jest.Mock>;
  let inventoryService: Record<string, jest.Mock>;
  let settings: {
    materialCharges: Record<string, number>;
    allowDiscounts: boolean;
    discountRoles: UserRole[];
  };
  const shirt = {
    id: 'item-shirt',
    name: 'Shirt',
    category: null,
    priceStandard: 1000,
    priceExpress: 1500,
    priceSameDay: null,
    isActive: true,
  };

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
    // Order creation runs in a transaction; route the manager's saves to the
    // repository mocks so assertions can check what was written.
    const manager = {
      save: jest.fn((entity: unknown, val: object) =>
        entity === OrderStatusHistory
          ? (statusHistoryRepo.save(val) as Promise<unknown>)
          : (ordersRepo.save(val) as Promise<unknown>),
      ),
    };
    dataSource = {
      query: jest.fn().mockResolvedValue([{ num: 1 }]),
      transaction: jest.fn((cb: (m: typeof manager) => Promise<unknown>) =>
        cb(manager),
      ),
    };
    inventoryService = {
      consumeForOrder: jest.fn().mockResolvedValue(undefined),
    };

    catalogService = {
      findByIds: jest.fn().mockResolvedValue([shirt]),
    };
    settings = {
      materialCharges: { HANGER: 100 },
      allowDiscounts: false,
      discountRoles: [],
    };
    settingsService = { get: jest.fn(() => Promise.resolve(settings)) };

    service = new OrdersService(
      ordersRepo as never,
      orderItemsRepo as never,
      orderMaterialsRepo as never,
      statusHistoryRepo as never,
      customersRepo as never,
      dataSource as never,
      catalogService as never,
      settingsService as never,
      inventoryService as never,
    );
  });

  const receptionist = { id: 'user-1', role: UserRole.RECEPTIONIST };

  describe('create', () => {
    beforeEach(() => {
      customersRepo.findOne.mockResolvedValue({ id: 'cust-1', name: 'Alice' });
      ordersRepo.findOne.mockResolvedValue({ id: 'order-uuid-1' });
    });

    it('prices items from the price list at the order speed, not from the client', async () => {
      await service.create(
        {
          customerId: 'cust-1',
          serviceTier: ServiceTier.EXPRESS,
          items: [{ serviceItemId: shirt.id, quantity: 2 }],
          materials: [{ materialType: MaterialType.HANGER, quantity: 2 }],
        },
        receptionist,
      );

      expect(ordersRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceTier: ServiceTier.EXPRESS,
          subtotal: 3000, // 2 x 1500 express price
          materialCharges: 200, // 2 x 100 from Settings
          total: 3200,
          balance: 3200,
          paymentStatus: PaymentStatus.UNPAID,
          status: OrderStatus.RECEIVED,
          createdByUserId: 'user-1',
        }),
      );
      const created = (
        ordersRepo.create.mock.calls[0] as [
          {
            items: {
              unitPrice: number;
              garmentName: string;
              serviceItemId: string;
            }[];
          },
        ]
      )[0];
      expect(created.items[0]).toMatchObject({
        unitPrice: 1500,
        garmentName: 'Shirt',
        serviceItemId: shirt.id,
      });
      expect(statusHistoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ newStatus: OrderStatus.RECEIVED }),
      );
      // Packaging is taken out of stock in the same transaction (rule #6).
      expect(inventoryService.consumeForOrder).toHaveBeenCalledWith(
        expect.anything(),
        'order-uuid-1',
        expect.any(String),
        [
          expect.objectContaining({
            materialType: MaterialType.HANGER,
            quantity: 2,
            customerProvided: false,
          }),
        ],
        'user-1',
      );
    });

    it('rejects an item with no price for the chosen speed', async () => {
      await expect(
        service.create(
          {
            customerId: 'cust-1',
            serviceTier: ServiceTier.SAME_DAY,
            items: [{ serviceItemId: shirt.id, quantity: 1 }],
          },
          receptionist,
        ),
      ).rejects.toThrow(/no Same-Day price/);
    });

    it('rejects an item that is not on the active price list', async () => {
      catalogService.findByIds.mockResolvedValue([
        { ...shirt, isActive: false },
      ]);
      await expect(
        service.create(
          {
            customerId: 'cust-1',
            items: [{ serviceItemId: shirt.id, quantity: 1 }],
          },
          receptionist,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('charges customer-provided materials at zero, even with no charge set (rule #4)', async () => {
      await service.create(
        {
          customerId: 'cust-1',
          items: [{ serviceItemId: shirt.id, quantity: 1 }],
          materials: [
            {
              materialType: MaterialType.BAG,
              quantity: 1,
              customerProvided: true,
            },
          ],
        },
        receptionist,
      );
      expect(ordersRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ materialCharges: 0, total: 1000 }),
      );
    });

    it('rejects a material whose charge the owner has not set', async () => {
      await expect(
        service.create(
          {
            customerId: 'cust-1',
            items: [{ serviceItemId: shirt.id, quantity: 1 }],
            materials: [{ materialType: MaterialType.BAG, quantity: 1 }],
          },
          receptionist,
        ),
      ).rejects.toThrow(/No charge is set for bags/);
    });

    it('refuses discounts unless the owner allows them for that role', async () => {
      const order = {
        customerId: 'cust-1',
        items: [{ serviceItemId: shirt.id, quantity: 1 }],
        discount: 100,
      };
      await expect(service.create(order, receptionist)).rejects.toThrow(
        ForbiddenException,
      );

      settings.allowDiscounts = true;
      settings.discountRoles = [UserRole.RECEPTIONIST];
      await service.create(order, receptionist);
      expect(ordersRepo.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ discount: 100, total: 900 }),
      );
    });

    it('never lets a discount exceed the order total', async () => {
      settings.allowDiscounts = true;
      await expect(
        service.create(
          {
            customerId: 'cust-1',
            items: [{ serviceItemId: shirt.id, quantity: 1 }],
            discount: 5000,
          },
          { id: 'owner', role: UserRole.SUPER_ADMIN },
        ),
      ).rejects.toThrow(/larger than the order total/);
    });

    it('throws NotFoundException if customer does not exist', async () => {
      customersRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create(
          {
            customerId: 'missing-cust',
            items: [{ serviceItemId: shirt.id, quantity: 1 }],
          },
          receptionist,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if items array is empty', async () => {
      await expect(
        service.create({ customerId: 'cust-1', items: [] }, receptionist),
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
