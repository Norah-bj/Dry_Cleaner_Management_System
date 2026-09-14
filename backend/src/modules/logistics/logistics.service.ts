import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  PickupRequest,
  PickupStatus,
} from './entities/pickup-request.entity';
import {
  DeliveryRequest,
  DeliveryStatus,
} from './entities/delivery-request.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Order } from '../orders/entities/order.entity';
import { CreatePickupDto } from './dto/create-pickup.dto';
import { UpdatePickupDto } from './dto/update-pickup.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import {
  QueryDeliveriesDto,
  QueryPickupsDto,
} from './dto/query-logistics.dto';
import { PaginatedResult } from '../../common/types/paginated-result';

@Injectable()
export class LogisticsService {
  constructor(
    @InjectRepository(PickupRequest)
    private readonly pickupsRepository: Repository<PickupRequest>,
    @InjectRepository(DeliveryRequest)
    private readonly deliveriesRepository: Repository<DeliveryRequest>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  private async generatePickupNumber(): Promise<string> {
    const year = new Date().getFullYear();
    try {
      const result = (await this.dataSource.query(
        `SELECT nextval('pickup_number_seq') AS num`,
      )) as Array<{ num: string | number }>;
      const seq = String(result[0].num).padStart(5, '0');
      return `PKP-${year}-${seq}`;
    } catch {
      const count = await this.pickupsRepository.count();
      return `PKP-${year}-${String(count + 1).padStart(5, '0')}`;
    }
  }

  private async generateDeliveryNumber(): Promise<string> {
    const year = new Date().getFullYear();
    try {
      const result = (await this.dataSource.query(
        `SELECT nextval('delivery_number_seq') AS num`,
      )) as Array<{ num: string | number }>;
      const seq = String(result[0].num).padStart(5, '0');
      return `DLV-${year}-${seq}`;
    } catch {
      const count = await this.deliveriesRepository.count();
      return `DLV-${year}-${String(count + 1).padStart(5, '0')}`;
    }
  }

  // ── PICKUPS ─────────────────────────────────────────────────────────────

  async createPickup(dto: CreatePickupDto): Promise<PickupRequest> {
    const customer = await this.customersRepository.findOne({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${dto.customerId} not found`,
      );
    }

    const pickupNumber = await this.generatePickupNumber();

    const pickup = this.pickupsRepository.create({
      pickupNumber,
      customerId: dto.customerId,
      orderId: dto.orderId ?? null,
      pickupAddress: dto.pickupAddress,
      scheduledDate: dto.scheduledDate,
      timeSlot: dto.timeSlot ?? 'Morning (08:00 - 12:00)',
      status: dto.status ?? PickupStatus.REQUESTED,
      assignedDriverId: dto.assignedDriverId ?? null,
      assignedDriverName: dto.assignedDriverName ?? null,
      notes: dto.notes ?? null,
    });

    return this.pickupsRepository.save(pickup);
  }

  async findAllPickups(
    query: QueryPickupsDto,
  ): Promise<PaginatedResult<PickupRequest>> {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const qb = this.pickupsRepository
      .createQueryBuilder('pickup')
      .leftJoinAndSelect('pickup.customer', 'customer')
      .leftJoinAndSelect('pickup.order', 'order')
      .orderBy('pickup.scheduledDate', 'ASC')
      .addOrderBy('pickup.createdAt', 'DESC')
      .skip(skip)
      .take(perPage);

    if (query.search) {
      qb.andWhere(
        '(pickup.pickupNumber ILIKE :search OR customer.name ILIKE :search OR customer.phone ILIKE :search OR pickup.pickupAddress ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.date) {
      qb.andWhere('pickup.scheduledDate = :date', { date: query.date });
    }

    if (query.driverId) {
      qb.andWhere('pickup.assignedDriverId = :driverId', {
        driverId: query.driverId,
      });
    }

    if (query.status) {
      qb.andWhere('pickup.status = :status', { status: query.status });
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

  async findOnePickup(id: string): Promise<PickupRequest> {
    const pickup = await this.pickupsRepository.findOne({
      where: { id },
      relations: {
        customer: true,
        order: true,
      },
    });

    if (!pickup) {
      throw new NotFoundException(`Pickup request ${id} not found`);
    }

    return pickup;
  }

  async updatePickup(id: string, dto: UpdatePickupDto): Promise<PickupRequest> {
    const pickup = await this.findOnePickup(id);

    if (dto.status !== undefined) pickup.status = dto.status;
    if (dto.assignedDriverId !== undefined)
      pickup.assignedDriverId = dto.assignedDriverId;
    if (dto.assignedDriverName !== undefined)
      pickup.assignedDriverName = dto.assignedDriverName;
    if (dto.scheduledDate !== undefined)
      pickup.scheduledDate = dto.scheduledDate;
    if (dto.timeSlot !== undefined) pickup.timeSlot = dto.timeSlot;
    if (dto.notes !== undefined) pickup.notes = dto.notes;

    return this.pickupsRepository.save(pickup);
  }

  // ── DELIVERIES ──────────────────────────────────────────────────────────

  async createDelivery(dto: CreateDeliveryDto): Promise<DeliveryRequest> {
    const order = await this.ordersRepository.findOne({
      where: { id: dto.orderId },
      relations: { customer: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
    }

    const deliveryNumber = await this.generateDeliveryNumber();
    const amountCollectable =
      dto.amountCollectable !== undefined
        ? Number(dto.amountCollectable)
        : Number(order.balance);

    const delivery = this.deliveriesRepository.create({
      deliveryNumber,
      orderId: dto.orderId,
      deliveryAddress: dto.deliveryAddress,
      scheduledDate: dto.scheduledDate,
      timeSlot: dto.timeSlot ?? 'Morning (08:00 - 12:00)',
      amountCollectable,
      status: dto.status ?? DeliveryStatus.SCHEDULED,
      assignedDriverId: dto.assignedDriverId ?? null,
      assignedDriverName: dto.assignedDriverName ?? null,
      notes: dto.notes ?? null,
    });

    return this.deliveriesRepository.save(delivery);
  }

  async findAllDeliveries(
    query: QueryDeliveriesDto,
  ): Promise<PaginatedResult<DeliveryRequest>> {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const qb = this.deliveriesRepository
      .createQueryBuilder('delivery')
      .leftJoinAndSelect('delivery.order', 'order')
      .leftJoinAndSelect('order.customer', 'customer')
      .orderBy('delivery.scheduledDate', 'ASC')
      .addOrderBy('delivery.createdAt', 'DESC')
      .skip(skip)
      .take(perPage);

    if (query.search) {
      qb.andWhere(
        '(delivery.deliveryNumber ILIKE :search OR customer.name ILIKE :search OR customer.phone ILIKE :search OR delivery.deliveryAddress ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.date) {
      qb.andWhere('delivery.scheduledDate = :date', { date: query.date });
    }

    if (query.driverId) {
      qb.andWhere('delivery.assignedDriverId = :driverId', {
        driverId: query.driverId,
      });
    }

    if (query.status) {
      qb.andWhere('delivery.status = :status', { status: query.status });
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

  async findOneDelivery(id: string): Promise<DeliveryRequest> {
    const delivery = await this.deliveriesRepository.findOne({
      where: { id },
      relations: {
        order: {
          customer: true,
        },
      },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery request ${id} not found`);
    }

    return delivery;
  }

  async updateDelivery(
    id: string,
    dto: UpdateDeliveryDto,
  ): Promise<DeliveryRequest> {
    const delivery = await this.findOneDelivery(id);

    if (dto.status !== undefined) delivery.status = dto.status;
    if (dto.assignedDriverId !== undefined)
      delivery.assignedDriverId = dto.assignedDriverId;
    if (dto.assignedDriverName !== undefined)
      delivery.assignedDriverName = dto.assignedDriverName;
    if (dto.scheduledDate !== undefined)
      delivery.scheduledDate = dto.scheduledDate;
    if (dto.timeSlot !== undefined) delivery.timeSlot = dto.timeSlot;
    if (dto.amountCollectable !== undefined)
      delivery.amountCollectable = Number(dto.amountCollectable);
    if (dto.notes !== undefined) delivery.notes = dto.notes;

    return this.deliveriesRepository.save(delivery);
  }

  // ── DRIVER TASKS FEED ───────────────────────────────────────────────────

  async getDriverTasks(driverId: string) {
    const activePickupStatuses = [
      PickupStatus.SCHEDULED,
      PickupStatus.DRIVER_ASSIGNED,
      PickupStatus.ON_THE_WAY,
    ];

    const activeDeliveryStatuses = [
      DeliveryStatus.SCHEDULED,
      DeliveryStatus.DRIVER_ASSIGNED,
      DeliveryStatus.OUT_FOR_DELIVERY,
    ];

    const pickups = await this.pickupsRepository.find({
      where: { assignedDriverId: driverId },
      relations: { customer: true },
      order: { scheduledDate: 'ASC', createdAt: 'ASC' },
    });

    const deliveries = await this.deliveriesRepository.find({
      where: { assignedDriverId: driverId },
      relations: {
        order: {
          customer: true,
        },
      },
      order: { scheduledDate: 'ASC', createdAt: 'ASC' },
    });

    return {
      driverId,
      pickups,
      deliveries,
      activePickupsCount: pickups.filter((p) =>
        activePickupStatuses.includes(p.status),
      ).length,
      activeDeliveriesCount: deliveries.filter((d) =>
        activeDeliveryStatuses.includes(d.status),
      ).length,
    };
  }
}
