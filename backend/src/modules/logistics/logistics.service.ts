import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PickupRequest, PickupStatus } from './entities/pickup-request.entity';
import {
  DeliveryRequest,
  DeliveryStatus,
} from './entities/delivery-request.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Order } from '../orders/entities/order.entity';
import { CreatePickupDto } from './dto/create-pickup.dto';
import { PublicPickupRequestDto } from './dto/public-pickup-request.dto';
import { CustomersService } from '../customers/customers.service';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

/** Who is changing a pickup/delivery; drivers may only touch their own jobs. */
export interface LogisticsActor {
  id: string;
  role: UserRole;
}

/** What a driver sees for a job: no prices, totals or payment status (rule #8). */
export interface DriverJob {
  id: string;
  type: 'PICKUP' | 'DELIVERY';
  reference: string;
  orderNumber: string | null;
  status: string;
  scheduledDate: string;
  timeSlot: string | null;
  customerName: string;
  customerPhone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  /** Cash the driver must collect on delivery - part of the job, not pricing detail. */
  amountToCollect: number;
  notes: string | null;
}
import { UpdatePickupDto } from './dto/update-pickup.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { QueryDeliveriesDto, QueryPickupsDto } from './dto/query-logistics.dto';
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
    private readonly customersService: CustomersService,
    private readonly settingsService: SettingsService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Once the owner has set time windows, every pickup/delivery must use one
   * of them. Before that, a free-text window is accepted.
   */
  private async resolveTimeSlot(
    slot: string | undefined,
    required: boolean,
  ): Promise<string | null> {
    const { timeSlots } = await this.settingsService.get();
    const value = slot?.trim() || null;
    if (timeSlots.length === 0) return value;
    if (!value) {
      if (!required) return null;
      throw new BadRequestException(
        `Choose a time window: ${timeSlots.join(', ')}`,
      );
    }
    if (!timeSlots.includes(value)) {
      throw new BadRequestException(
        `"${value}" is not one of the time windows: ${timeSlots.join(', ')}`,
      );
    }
    return value;
  }

  /** Assigned drivers must be active driver logins; their name is taken from the account. */
  private async resolveDriver(
    driverId: string | null | undefined,
  ): Promise<{ id: string | null; name: string | null } | undefined> {
    if (driverId === undefined) return undefined;
    if (driverId === null || driverId === '') return { id: null, name: null };
    const user = await this.usersService.findById(driverId);
    if (!user || !user.isActive || user.role !== UserRole.DRIVER) {
      throw new BadRequestException(
        'Assigned driver must be an active driver login',
      );
    }
    return { id: user.id, name: user.fullName };
  }

  private assertDriverOwnsJob(
    assignedDriverId: string | null,
    dto: object,
    actor?: LogisticsActor,
  ): void {
    if (actor?.role !== UserRole.DRIVER) return;
    if (assignedDriverId !== actor.id) {
      throw new ForbiddenException('This job is not assigned to you');
    }
    const fields = Object.keys(dto).filter(
      (k) => (dto as Record<string, unknown>)[k] !== undefined,
    );
    if (fields.some((k) => k !== 'status' && k !== 'notes')) {
      throw new ForbiddenException(
        'Drivers can only update the status and notes of a job',
      );
    }
  }

  private async generatePickupNumber(): Promise<string> {
    const year = new Date().getFullYear();
    try {
      const result = await this.dataSource.query<{ num: string }[]>(
        `SELECT nextval('pickup_number_seq') AS num`,
      );
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
      const result = await this.dataSource.query<{ num: string }[]>(
        `SELECT nextval('delivery_number_seq') AS num`,
      );
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

    const timeSlot = await this.resolveTimeSlot(dto.timeSlot, true);
    const driver = await this.resolveDriver(dto.assignedDriverId);
    const pickupNumber = await this.generatePickupNumber();

    const pickup = this.pickupsRepository.create({
      pickupNumber,
      customerId: dto.customerId,
      orderId: dto.orderId ?? null,
      pickupAddress: dto.pickupAddress,
      scheduledDate: dto.scheduledDate,
      timeSlot,
      status: dto.status ?? PickupStatus.REQUESTED,
      assignedDriverId: driver?.id ?? null,
      assignedDriverName: driver?.name ?? null,
      notes: dto.notes ?? null,
    });

    return this.pickupsRepository.save(pickup);
  }

  /**
   * Public pickup request: reuse the customer with this exact phone, or
   * register a new one, then create a REQUESTED pickup. Returns only the
   * reference details - never other customers' data.
   */
  async requestPickupPublic(dto: PublicPickupRequestDto): Promise<{
    pickupNumber: string;
    scheduledDate: string;
    timeSlot: string | null;
  }> {
    const phone = dto.phone.replace(/\s+/g, '');
    let customer = await this.customersRepository.findOne({ where: { phone } });
    if (!customer) {
      customer = await this.customersService.create({
        name: dto.name.trim(),
        phone,
        address: dto.address.trim(),
      });
    }

    const pickup = await this.createPickup({
      customerId: customer.id,
      pickupAddress: dto.address.trim(),
      scheduledDate: dto.scheduledDate,
      timeSlot: dto.timeSlot,
      status: PickupStatus.REQUESTED,
      notes: dto.notes,
    });

    return {
      pickupNumber: pickup.pickupNumber,
      scheduledDate: pickup.scheduledDate,
      timeSlot: pickup.timeSlot,
    };
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

  async updatePickup(
    id: string,
    dto: UpdatePickupDto,
    actor?: LogisticsActor,
  ): Promise<PickupRequest> {
    const pickup = await this.findOnePickup(id);
    this.assertDriverOwnsJob(pickup.assignedDriverId, dto, actor);

    const driver = await this.resolveDriver(dto.assignedDriverId);
    if (driver) {
      pickup.assignedDriverId = driver.id;
      pickup.assignedDriverName = driver.name;
    }
    if (dto.status !== undefined) pickup.status = dto.status;
    if (dto.scheduledDate !== undefined)
      pickup.scheduledDate = dto.scheduledDate;
    if (dto.timeSlot !== undefined)
      pickup.timeSlot = await this.resolveTimeSlot(dto.timeSlot, true);
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

    const timeSlot = await this.resolveTimeSlot(dto.timeSlot, true);
    const driver = await this.resolveDriver(dto.assignedDriverId);
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
      timeSlot,
      amountCollectable,
      status: dto.status ?? DeliveryStatus.SCHEDULED,
      assignedDriverId: driver?.id ?? null,
      assignedDriverName: driver?.name ?? null,
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
    actor?: LogisticsActor,
  ): Promise<DeliveryRequest> {
    const delivery = await this.findOneDelivery(id);
    this.assertDriverOwnsJob(delivery.assignedDriverId, dto, actor);

    const driver = await this.resolveDriver(dto.assignedDriverId);
    if (driver) {
      delivery.assignedDriverId = driver.id;
      delivery.assignedDriverName = driver.name;
    }
    if (dto.status !== undefined) delivery.status = dto.status;
    if (dto.scheduledDate !== undefined)
      delivery.scheduledDate = dto.scheduledDate;
    if (dto.timeSlot !== undefined)
      delivery.timeSlot = await this.resolveTimeSlot(dto.timeSlot, true);
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

    const toNumber = (v: unknown) =>
      v === null || v === undefined ? null : Number(v);

    // Business rule #8: only what the driver needs to do the job.
    const pickupJobs: DriverJob[] = pickups.map((p) => ({
      id: p.id,
      type: 'PICKUP',
      reference: p.pickupNumber,
      orderNumber: null,
      status: p.status,
      scheduledDate: p.scheduledDate,
      timeSlot: p.timeSlot,
      customerName: p.customer?.name ?? '',
      customerPhone: p.customer?.phone ?? '',
      address: p.pickupAddress,
      latitude: toNumber(p.customer?.latitude),
      longitude: toNumber(p.customer?.longitude),
      amountToCollect: 0,
      notes: p.notes,
    }));
    const deliveryJobs: DriverJob[] = deliveries.map((d) => ({
      id: d.id,
      type: 'DELIVERY',
      reference: d.deliveryNumber,
      orderNumber: d.order?.orderNumber ?? null,
      status: d.status,
      scheduledDate: d.scheduledDate,
      timeSlot: d.timeSlot,
      customerName: d.order?.customer?.name ?? '',
      customerPhone: d.order?.customer?.phone ?? '',
      address: d.deliveryAddress,
      latitude: toNumber(d.order?.customer?.latitude),
      longitude: toNumber(d.order?.customer?.longitude),
      amountToCollect: Number(d.amountCollectable ?? 0),
      notes: d.notes,
    }));

    return {
      driverId,
      pickups: pickupJobs,
      deliveries: deliveryJobs,
      activePickupsCount: pickups.filter((p) =>
        activePickupStatuses.includes(p.status),
      ).length,
      activeDeliveriesCount: deliveries.filter((d) =>
        activeDeliveryStatuses.includes(d.status),
      ).length,
    };
  }
}
