import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ServiceItem } from './entities/service-item.entity';
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

  async create(dto: CreateServiceItemDto): Promise<ServiceItem> {
    return this.saveUnique(
      this.itemsRepository.create({
        name: dto.name.trim(),
        category: dto.category ?? null,
        priceStandard: dto.priceStandard ?? null,
        priceExpress: dto.priceExpress ?? null,
        priceSameDay: dto.priceSameDay ?? null,
        sortOrder: dto.sortOrder ?? 0,
      }),
    );
  }

  async update(id: string, dto: UpdateServiceItemDto): Promise<ServiceItem> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    if (dto.name) item.name = dto.name.trim();
    return this.saveUnique(item);
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
