import {
  BadRequestException,
  ForbiddenException,
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
import { CatalogService } from '../catalog/catalog.service';
import { priceForTier } from '../catalog/entities/service-item.entity';
import { SettingsService } from '../settings/settings.service';
import { InventoryService } from '../inventory/inventory.service';
import { BusinessSettings } from '../settings/entities/business-settings.entity';
import { UserRole } from '../users/entities/user.entity';

/** Who is creating/editing the order, for the discount policy. */
export interface OrderActor {
  id: string;
  role: UserRole;
}

const TIER_LABELS: Record<ServiceTier, string> = {
  [ServiceTier.STANDARD]: 'Standard',
  [ServiceTier.EXPRESS]: 'Express',
  [ServiceTier.SAME_DAY]: 'Same-Day',
};

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
    private readonly catalogService: CatalogService,
    private readonly settingsService: SettingsService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Discounts follow the owner's policy in Settings: off unless enabled, and
   * only for the roles the owner chose (a Super Admin always may). A discount
   * can never exceed the amount owed.
   */
  private assertDiscountAllowed(
    discount: number,
    amountBeforeDiscount: number,
    actor: OrderActor | undefined,
    settings: BusinessSettings,
  ): void {
    if (discount <= 0) return;
    const roleAllowed =
      actor?.role === UserRole.SUPER_ADMIN ||
      (!!actor && settings.discountRoles.includes(actor.role));
    if (!settings.allowDiscounts || !roleAllowed) {
      throw new ForbiddenException(
        'Discounts are not allowed for your role. The owner can change this in Settings.',
      );
    }
    if (discount > amountBeforeDiscount) {
      throw new BadRequestException(
        'The discount is larger than the order total',
      );
    }
  }

  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    try {
      const result = await this.dataSource.query<{ num: string }[]>(
        `SELECT nextval('order_number_seq') AS num`,
      );
      const seq = String(result[0].num).padStart(5, '0');
      return `ORD-${year}-${seq}`;
    } catch {
      const count = await this.ordersRepository.count();
      return `ORD-${year}-${String(count + 1).padStart(5, '0')}`;
    }
  }

  async create(dto: CreateOrderDto, actor?: OrderActor): Promise<Order> {
    const userId = actor?.id;
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

    const tier = dto.serviceTier ?? ServiceTier.STANDARD;
    const settings = await this.settingsService.get();

    // Prices come from the owner's price list, never from the client.
    const catalog = await this.catalogService.findByIds([
      ...new Set(dto.items.map((i) => i.serviceItemId)),
    ]);
    const byId = new Map(catalog.map((c) => [c.id, c]));

    let subtotal = 0;
    const items = dto.items.map((itemDto) => {
      const catalogItem = byId.get(itemDto.serviceItemId);
      if (!catalogItem || !catalogItem.isActive) {
        throw new BadRequestException(
          `Service item ${itemDto.serviceItemId} is not on the active price list`,
        );
      }
      const unitPrice = priceForTier(catalogItem, tier);
      if (unitPrice === null) {
        throw new BadRequestException(
          `"${catalogItem.name}" has no ${TIER_LABELS[tier]} price. Set one in Settings → Services & Prices, or choose another speed.`,
        );
      }
      const lineTotal = unitPrice * itemDto.quantity;
      subtotal += lineTotal;
      const item = new OrderItem();
      item.serviceItemId = catalogItem.id;
      item.garmentName = catalogItem.name;
      item.category = catalogItem.category ?? 'Standard';
      item.quantity = itemDto.quantity;
      item.unitPrice = unitPrice;
      item.lineTotal = lineTotal;
      item.serviceTier = tier;
      item.notes = itemDto.notes ?? null;
      return item;
    });

    // Material charges come from Settings; customer-supplied ones are zero (rule #4).
    let materialCharges = 0;
    const materials = (dto.materials ?? []).map((matDto) => {
      const customerProvided = matDto.customerProvided ?? false;
      const configured = settings.materialCharges[matDto.materialType];
      if (!customerProvided && configured === undefined) {
        throw new BadRequestException(
          `No charge is set for ${matDto.materialType.toLowerCase()}s. Set it in Settings → Payments & Charges (0 if you don't charge).`,
        );
      }
      const unitCharge = customerProvided ? 0 : Number(configured);
      const totalCharge = unitCharge * matDto.quantity;
      materialCharges += totalCharge;
      const mat = new OrderMaterial();
      mat.materialType = matDto.materialType;
      mat.quantity = matDto.quantity;
      mat.customerProvided = customerProvided;
      mat.unitCharge = unitCharge;
      mat.totalCharge = totalCharge;
      return mat;
    });

    const discount = Number(dto.discount ?? 0);
    this.assertDiscountAllowed(
      discount,
      subtotal + materialCharges,
      actor,
      settings,
    );
    const total = subtotal + materialCharges - discount;
    const orderNumber = await this.generateOrderNumber();
    const amountPaid = 0;
    const balance = total;
    const initialStatus = dto.status ?? OrderStatus.RECEIVED;

    const order = this.ordersRepository.create({
      orderNumber,
      customerId: dto.customerId,
      serviceTier: tier,
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

    // Order, its first status-history row and the packaging taken out of
    // stock are saved together: if stock is short, nothing is saved.
    const savedId = await this.dataSource.transaction(async (manager) => {
      const savedOrder = await manager.save(Order, order);
      await manager.save(OrderStatusHistory, {
        orderId: savedOrder.id,
        previousStatus: null,
        newStatus: initialStatus,
        notes: 'Initial order intake',
        changedByUserId: userId ?? null,
      });
      await this.inventoryService.consumeForOrder(
        manager,
        savedOrder.id,
        savedOrder.orderNumber,
        materials,
        userId,
      );
      return savedOrder.id;
    });

    return this.findOne(savedId);
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

  /**
   * Public tracking by order number. Order numbers are sequential, so this
   * returns only what the customer needs - no phone, address or staff data.
   * The first name lets the customer recognise their own order.
   */
  async trackPublic(orderNumber: string) {
    const order = await this.findByOrderNumber(
      orderNumber.trim().toUpperCase(),
    );
    return {
      orderNumber: order.orderNumber,
      customerFirstName: (order.customer?.name ?? '').split(' ')[0],
      status: order.status,
      serviceTier: order.serviceTier,
      expectedCompletion: order.expectedCompletion,
      total: Number(order.total),
      amountPaid: Number(order.amountPaid),
      balance: Number(order.balance),
      paymentStatus: order.paymentStatus,
      items: (order.items ?? []).map((i) => ({
        garmentName: i.garmentName,
        quantity: i.quantity,
      })),
    };
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

  async update(
    id: string,
    dto: UpdateOrderDto,
    actor?: OrderActor,
  ): Promise<Order> {
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
      // Decimal columns arrive as strings: convert before doing arithmetic.
      const beforeDiscount =
        Number(order.subtotal) + Number(order.materialCharges);
      const discount = Number(dto.discount);
      this.assertDiscountAllowed(
        discount,
        beforeDiscount,
        actor,
        await this.settingsService.get(),
      );
      const total = beforeDiscount - discount;
      if (total < Number(order.amountPaid)) {
        throw new BadRequestException(
          'This discount would make the total less than what the customer already paid',
        );
      }
      order.discount = discount;
      order.total = total;
      order.balance = total - Number(order.amountPaid);
      if (order.balance === 0 && order.total > 0) {
        order.paymentStatus = PaymentStatus.PAID;
      } else if (Number(order.amountPaid) > 0) {
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
