import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ServiceItem } from './entities/service-item.entity';
import { AuditService } from '../audit/audit.service';
import {
  CreateServiceItemDto,
  UpdateServiceItemDto,
} from './dto/service-item.dto';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(ServiceItem)
    private readonly itemsRepository: Repository<ServiceItem>,
    private readonly auditService: AuditService,
  ) {}

  findAll(includeInactive = false): Promise<ServiceItem[]> {
    return this.itemsRepository.find({
      where: includeInactive ? {} : { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ServiceItem> {
    const item = await this.itemsRepository.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Service item ${id} not found`);
    return item;
  }

  findByIds(ids: string[]): Promise<ServiceItem[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.itemsRepository
      .createQueryBuilder('item')
      .where('item.id IN (:...ids)', { ids })
      .getMany();
  }

  private prices(i: ServiceItem) {
    return {
      standard: i.priceStandard,
      express: i.priceExpress,
      sameDay: i.priceSameDay,
    };
  }

  async create(
    dto: CreateServiceItemDto,
    actorId?: string,
  ): Promise<ServiceItem> {
    const saved = await this.saveUnique(
      this.itemsRepository.create({
        name: dto.name.trim(),
        category: dto.category ?? null,
        priceStandard: dto.priceStandard ?? null,
        priceExpress: dto.priceExpress ?? null,
        priceSameDay: dto.priceSameDay ?? null,
        sortOrder: dto.sortOrder ?? 0,
      }),
    );
    await this.auditService.log({
      actorId,
      action: 'price_list.item_created',
      entityType: 'price_list',
      entityId: saved.id,
      summary: `Added "${saved.name}" to the price list`,
      details: { prices: this.prices(saved) },
    });
    return saved;
  }

  async update(
    id: string,
    dto: UpdateServiceItemDto,
    actorId?: string,
  ): Promise<ServiceItem> {
    const item = await this.findOne(id);
    const before = {
      name: item.name,
      isActive: item.isActive,
      prices: this.prices(item),
    };
    Object.assign(item, dto);
    if (dto.name) item.name = dto.name.trim();
    const saved = await this.saveUnique(item);
    const after = {
      name: saved.name,
      isActive: saved.isActive,
      prices: this.prices(saved),
    };
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      const what =
        JSON.stringify(before.prices) !== JSON.stringify(after.prices)
          ? 'changed prices'
          : before.isActive !== after.isActive
            ? after.isActive
              ? 'shown again'
              : 'hidden'
            : 'edited';
      await this.auditService.log({
        actorId,
        action: 'price_list.item_updated',
        entityType: 'price_list',
        entityId: saved.id,
        summary: `"${saved.name}" ${what}`,
        details: { before, after },
      });
    }
    return saved;
  }

  private async saveUnique(item: ServiceItem): Promise<ServiceItem> {
    try {
      return await this.itemsRepository.save(item);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string }).code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          `A service called "${item.name}" already exists`,
        );
      }
      throw err;
    }
  }
}
