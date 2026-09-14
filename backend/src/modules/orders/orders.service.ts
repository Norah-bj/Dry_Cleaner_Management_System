import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Order,
  OrderStatus,
  PaymentStatus,
  ServiceTier,
} from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderMaterial } from './entities/order-material.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { PaginatedResult } from '../../common/types/paginated-result';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(OrderMaterial)
    private readonly orderMaterialsRepository: Repository<OrderMaterial>,
    @InjectRepository(OrderStatusHistory)
    private readonly statusHistoryRepository: Repository<OrderStatusHistory>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    private readonly dataSource: DataSource,
  ) {}

  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    try {
      const result = (await this.dataSource.query(
        `SELECT nextval('order_number_seq') AS num`,
      )) as Array<{ num: string | number }>;
      const seq = String(result[0].num).padStart(5, '0');
      return `ORD-${year}-${seq}`;
    } catch {
      const count = await this.ordersRepository.count();
      return `ORD-${year}-${String(count + 1).padStart(5, '0')}`;
    }
  }

  async create(dto: CreateOrderDto, userId?: string): Promise<Order> {
    const customer = await this.customersRepository.findOne({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${dto.customerId} not found`,
      );
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(
        'An order must have at least one garment item',
      );
    }

    const orderNumber = await this.generateOrderNumber();

    // Calculate subtotal from items
    let subtotal = 0;
    const items = dto.items.map((itemDto) => {
      const lineTotal = Number(itemDto.unitPrice) * Number(itemDto.quantity);
      subtotal += lineTotal;
      const item = new OrderItem();
      item.garmentName = itemDto.garmentName;
      item.category = itemDto.category ?? 'Standard';
      item.quantity = itemDto.quantity;
      item.unitPrice = itemDto.unitPrice;
      item.lineTotal = lineTotal;
      item.serviceTier =
        itemDto.serviceTier ?? dto.serviceTier ?? ServiceTier.STANDARD;
      item.notes = itemDto.notes ?? null;
      return item;
    });

    // Calculate material charges
    let materialCharges = 0;
    const materials = (dto.materials ?? []).map((matDto) => {
      const totalCharge = matDto.customerProvided
        ? 0
        : Number(matDto.unitCharge) * Number(matDto.quantity);
      materialCharges += totalCharge;
      const mat = new OrderMaterial();
      mat.materialType = matDto.materialType;
      mat.quantity = matDto.quantity;
      mat.customerProvided = matDto.customerProvided ?? false;
      mat.unitCharge = matDto.unitCharge;
      mat.totalCharge = totalCharge;
      return mat;
    });

    const discount = Number(dto.discount ?? 0);
    const total = Math.max(0, subtotal + materialCharges - discount);
    const amountPaid = 0;
    const balance = total;
    const initialStatus = dto.status ?? OrderStatus.RECEIVED;

    const order = this.ordersRepository.create({
      orderNumber,
      customerId: dto.customerId,
      serviceTier: dto.serviceTier ?? ServiceTier.STANDARD,
      status: initialStatus,
      storageHangerId: dto.storageHangerId ?? null,
      storageBoxId: dto.storageBoxId ?? null,
      subtotal,
      materialCharges,
      discount,
      total,
      amountPaid,
      balance,
      paymentStatus: PaymentStatus.UNPAID,
      expectedCompletion: dto.expectedCompletion
        ? new Date(dto.expectedCompletion)
        : null,
      notes: dto.notes ?? null,
      createdByUserId: userId ?? null,
      items,
      materials,
    });

    const savedOrder = await this.ordersRepository.save(order);

    // Record initial status history
    await this.statusHistoryRepository.save({
      orderId: savedOrder.id,
      previousStatus: null,
      newStatus: initialStatus,
      notes: 'Initial order intake',
      changedByUserId: userId ?? null,
    });

    return this.findOne(savedOrder.id);
  }

  async findAll(query: QueryOrdersDto): Promise<PaginatedResult<Order>> {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const qb = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.materials', 'materials')
      .orderBy('order.createdAt', 'DESC')
      .skip(skip)
      .take(perPage);

    if (query.search) {
      qb.andWhere(
        '(order.orderNumber ILIKE :search OR customer.name ILIKE :search OR customer.phone ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query.paymentStatus) {
      qb.andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus: query.paymentStatus,
      });
    }

    if (query.serviceTier) {
      qb.andWhere('order.serviceTier = :serviceTier', {
        serviceTier: query.serviceTier,
      });
    }

    if (query.customerId) {
      qb.andWhere('order.customerId = :customerId', {
        customerId: query.customerId,
      });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        perPage,
        total,
      },
    };
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: {
        customer: true,
        items: true,
        materials: true,
        statusHistory: true,
        payments: true,
      },
      order: {
        statusHistory: { createdAt: 'ASC' },
        payments: { createdAt: 'DESC' },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async findByOrderNumber(orderNumber: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { orderNumber },
      relations: {
        customer: true,
        items: true,
        materials: true,
        statusHistory: true,
      },
      order: {
        statusHistory: { createdAt: 'ASC' },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }

    return order;
  }

  async update(id: string, dto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);

    if (dto.storageHangerId !== undefined) {
      order.storageHangerId = dto.storageHangerId;
    }
    if (dto.storageBoxId !== undefined) {
      order.storageBoxId = dto.storageBoxId;
    }
    if (dto.expectedCompletion !== undefined) {
      order.expectedCompletion = dto.expectedCompletion
        ? new Date(dto.expectedCompletion)
        : null;
    }
    if (dto.notes !== undefined) {
      order.notes = dto.notes;
    }
    if (dto.discount !== undefined) {
      order.discount = Number(dto.discount);
      order.total = Math.max(
        0,
        order.subtotal + order.materialCharges - order.discount,
      );
      order.balance = Math.max(0, order.total - order.amountPaid);
      if (order.balance === 0 && order.total > 0) {
        order.paymentStatus = PaymentStatus.PAID;
      } else if (order.amountPaid > 0) {
        order.paymentStatus = PaymentStatus.PARTIALLY_PAID;
      } else {
        order.paymentStatus = PaymentStatus.UNPAID;
      }
    }

    return this.ordersRepository.save(order);
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    userId?: string,
  ): Promise<Order> {
    const order = await this.findOne(id);
    const previousStatus = order.status;

    if (previousStatus === dto.status) {
      return order;
    }

    order.status = dto.status;
    const updated = await this.ordersRepository.save(order);

    await this.statusHistoryRepository.save({
      orderId: id,
      previousStatus,
      newStatus: dto.status,
      notes: dto.notes ?? null,
      changedByUserId: userId ?? null,
    });

    return updated;
  }
}
