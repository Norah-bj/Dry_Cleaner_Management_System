import { LaundryService } from './laundry.service';
import { Order, OrderStatus } from '../orders/entities/order.entity';

describe('LaundryService', () => {
  let service: LaundryService;
  let ordersRepo: any;

  beforeEach(() => {
    ordersRepo = {
      createQueryBuilder: jest.fn(),
    };
    service = new LaundryService(ordersRepo);
  });

  describe('getBoard', () => {
    it('returns orders organized into 8 active processing stage columns', async () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: '1', status: OrderStatus.RECEIVED, serviceTier: 'STANDARD' },
          { id: '2', status: OrderStatus.WASHING, serviceTier: 'SAME_DAY' },
        ] as Order[]),
      };
      ordersRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getBoard();

      expect(result.stages).toContain(OrderStatus.RECEIVED);
      expect(result.stages).toContain(OrderStatus.WASHING);
      expect(result.totalActive).toBe(2);
      expect(result.columns[OrderStatus.RECEIVED].length).toBe(1);
      expect(result.columns[OrderStatus.WASHING].length).toBe(1);
    });
  });

  describe('getMetrics', () => {
    it('returns counts per status', async () => {
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: OrderStatus.RECEIVED, count: '5' },
          { status: OrderStatus.READY, count: '3' },
        ]),
      };
      ordersRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getMetrics();

      expect(result[OrderStatus.RECEIVED]).toBe(5);
      expect(result[OrderStatus.READY]).toBe(3);
    });
  });
});
