import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';

@Injectable()
export class LaundryService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  async getBoard() {
    const activeStages = [
      OrderStatus.RECEIVED,
      OrderStatus.SORTING,
      OrderStatus.WASHING,
      OrderStatus.DRYING,
      OrderStatus.IRONING,
      OrderStatus.QUALITY_CHECK,
      OrderStatus.PACKING,
      OrderStatus.READY,
    ];

    const orders = await this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.status IN (:...stages)', { stages: activeStages })
      .orderBy(
        `CASE order.service_tier 
          WHEN 'SAME_DAY' THEN 1 
          WHEN 'EXPRESS' THEN 2 
          ELSE 3 
        END`,
        'ASC',
      )
      .addOrderBy('order.createdAt', 'ASC')
      .getMany();

    const columns: Record<string, Order[]> = {};
    for (const stage of activeStages) {
      columns[stage] = [];
    }

    for (const order of orders) {
      if (columns[order.status]) {
        columns[order.status].push(order);
      }
    }

    return {
      stages: activeStages,
      columns,
      totalActive: orders.length,
    };
  }

  async getMetrics() {
    const counts = await this.ordersRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(order.id)', 'count')
      .groupBy('order.status')
      .getRawMany();

    const stageMetrics: Record<string, number> = {};
    for (const row of counts) {
      stageMetrics[row.status] = parseInt(row.count, 10);
    }

    return stageMetrics;
  }
}
