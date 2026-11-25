import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { PaginatedResult } from '../../common/types/paginated-result';
import { MaterialType } from '../orders/entities/order-material.entity';
import {
  CreateInventoryItemDto,
  QueryInventoryItemsDto,
  QueryInventoryTransactionsDto,
  RecordInventoryTransactionDto,
  UpdateInventoryItemDto,
} from './dto/inventory.dto';
import {
  InventoryItem,
  StockStatus,
  stockStatus,
} from './entities/inventory-item.entity';
import {
  InventoryTransaction,
  InventoryTransactionType,
} from './entities/inventory-transaction.entity';

const UNIQUE_VIOLATION = '23505';

export type InventoryItemView = InventoryItem & { status: StockStatus };

interface StockChange {
  type: InventoryTransactionType;
  /** Signed change; the resulting level may not go below zero. */
  change: number;
  unitCost?: number | null;
  supplier?: string | null;
  notes?: string | null;
  orderId?: string | null;
  userId?: string | null;
}

/** Round to 2 decimals so 0.1 + 0.2 style float noise never reaches the DB. */
const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly itemsRepository: Repository<InventoryItem>,
    @InjectRepository(InventoryTransaction)
    private readonly transactionsRepository: Repository<InventoryTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  private view(item: InventoryItem): InventoryItemView {
    return Object.assign(item, { status: stockStatus(item) });
  }

  async findAll(query: QueryInventoryItemsDto): Promise<InventoryItemView[]> {
    const items = await this.itemsRepository.find({
      where: query.includeInactive === 'true' ? {} : { isActive: true },
      order: { category: 'ASC', name: 'ASC' },
    });
    const views = items.map((i) => this.view(i));
    return query.status === 'LOW'
      ? views.filter((v) => v.isActive && v.status !== 'GOOD')
      : views;
  }

  async findOne(id: string): Promise<InventoryItemView> {
    const item = await this.itemsRepository.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Inventory item ${id} not found`);
    return this.view(item);
  }

  async summary(): Promise<{ items: number; low: number; out: number }> {
    const items = (
      await this.itemsRepository.find({ where: { isActive: true } })
    ).map((i) => stockStatus(i));
    return {
      items: items.length,
      low: items.filter((s) => s === 'LOW').length,
      out: items.filter((s) => s === 'OUT').length,
    };
  }

  async create(
    dto: CreateInventoryItemDto,
    userId?: string,
  ): Promise<InventoryItemView> {
    return this.unique(async () => {
      const saved = await this.dataSource.transaction(async (manager) => {
        const item = await manager.save(
          manager.create(InventoryItem, {
            name: dto.name.trim(),
            category: dto.category?.trim() || null,
            unit: dto.unit?.trim() || 'pcs',
            minimumStock: dto.minimumStock ?? null,
            supplier: dto.supplier?.trim() || null,
            materialType: dto.materialType ?? null,
            stockQuantity: 0,
          }),
        );
        if (dto.openingStock && dto.openingStock > 0) {
          await this.applyChange(manager, item.id, {
            type: InventoryTransactionType.ADJUSTMENT,
            change: dto.openingStock,
            notes: 'Opening stock',
            userId,
          });
        }
        return item.id;
      });
      return this.findOne(saved);
    });
  }

  async update(
    id: string,
    dto: UpdateInventoryItemDto,
  ): Promise<InventoryItemView> {
    const item = await this.findOne(id);
    if (dto.name !== undefined) item.name = dto.name.trim();
    if (dto.category !== undefined)
      item.category = dto.category?.trim() || null;
    if (dto.unit !== undefined) item.unit = dto.unit.trim();
    if (dto.minimumStock !== undefined) item.minimumStock = dto.minimumStock;
    if (dto.supplier !== undefined)
      item.supplier = dto.supplier?.trim() || null;
    if (dto.materialType !== undefined) item.materialType = dto.materialType;
    if (dto.isActive !== undefined) item.isActive = dto.isActive;
    // Drop the computed field before saving.
    const { status: _status, ...entity } = item;
    void _status;
    await this.unique(() => this.itemsRepository.save(entity));
    return this.findOne(id);
  }

  async record(
    id: string,
    dto: RecordInventoryTransactionDto,
    userId?: string,
  ): Promise<InventoryTransaction> {
    return this.dataSource.transaction(async (manager) => {
      if (dto.type === InventoryTransactionType.ADJUSTMENT) {
        const item = await this.lockItem(manager, id);
        const change = round2((dto.countedQuantity ?? 0) - item.stockQuantity);
        if (change === 0) {
          throw new BadRequestException(
            'The counted quantity matches the current stock: nothing to adjust',
          );
        }
        return this.applyChange(manager, id, {
          type: dto.type,
          change,
          notes: dto.notes,
          userId,
        });
      }
      const quantity = dto.quantity ?? 0;
      return this.applyChange(manager, id, {
        type: dto.type,
        change:
          dto.type === InventoryTransactionType.PURCHASE ? quantity : -quantity,
        unitCost:
          dto.type === InventoryTransactionType.PURCHASE
            ? (dto.unitCost ?? null)
            : null,
        supplier:
          dto.type === InventoryTransactionType.PURCHASE
            ? dto.supplier?.trim() || null
            : null,
        notes: dto.notes,
        userId,
      });
    });
  }

  async transactions(
    query: QueryInventoryTransactionsDto,
  ): Promise<PaginatedResult<InventoryTransaction>> {
    const qb = this.transactionsRepository
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.item', 'item')
      .orderBy('tx.createdAt', 'DESC')
      .skip((query.page - 1) * query.perPage)
      .take(query.perPage);
    if (query.itemId)
      qb.andWhere('tx.inventoryItemId = :itemId', { itemId: query.itemId });
    if (query.type) qb.andWhere('tx.type = :type', { type: query.type });
    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { page: query.page, perPage: query.perPage, total } };
  }

  /**
   * Called inside the order-creation transaction: takes packaging used on
   * the order out of the linked stock item. A material with no linked
   * active item isn't tracked. Not enough stock rejects the whole order, so
   * stock and orders never disagree (business rule #6).
   */
  async consumeForOrder(
    manager: EntityManager,
    orderId: string,
    orderNumber: string,
    materials: {
      materialType: MaterialType;
      quantity: number;
      customerProvided: boolean;
    }[],
    userId?: string | null,
  ): Promise<void> {
    const used = new Map<MaterialType, number>();
    for (const m of materials) {
      if (!m.customerProvided)
        used.set(m.materialType, (used.get(m.materialType) ?? 0) + m.quantity);
    }
    for (const [materialType, quantity] of used) {
      const item = await manager.findOne(InventoryItem, {
        where: { materialType, isActive: true },
      });
      if (!item) continue;
      await this.applyChange(manager, item.id, {
        type: InventoryTransactionType.USAGE,
        change: -quantity,
        notes: `Used on order ${orderNumber}`,
        orderId,
        userId,
      });
    }
  }

  private async lockItem(
    manager: EntityManager,
    id: string,
  ): Promise<InventoryItem> {
    const item = await manager.findOne(InventoryItem, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!item) throw new NotFoundException(`Inventory item ${id} not found`);
    return item;
  }

  /** The only place stock levels change: locked row + ledger row, one transaction. */
  private async applyChange(
    manager: EntityManager,
    itemId: string,
    change: StockChange,
  ): Promise<InventoryTransaction> {
    const item = await this.lockItem(manager, itemId);
    const after = round2(item.stockQuantity + change.change);
    if (after < 0) {
      throw new BadRequestException(
        `Not enough ${item.name} in stock: ${item.stockQuantity} ${item.unit} left, ${Math.abs(change.change)} needed. Record a purchase or a stock count in Inventory.`,
      );
    }
    await manager.update(InventoryItem, item.id, { stockQuantity: after });
    return manager.save(
      manager.create(InventoryTransaction, {
        inventoryItemId: item.id,
        type: change.type,
        quantityChange: round2(change.change),
        quantityAfter: after,
        unitCost: change.unitCost ?? null,
        supplier: change.supplier ?? null,
        notes: change.notes?.trim() || null,
        orderId: change.orderId ?? null,
        createdByUserId: change.userId ?? null,
      }),
    );
  }

  private async unique<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string }).code === UNIQUE_VIOLATION
      ) {
        const detail = String(
          (err.driverError as { detail?: string }).detail ?? '',
        );
        throw new ConflictException(
          detail.includes('material_type')
            ? 'Another stock item is already linked to that packaging material'
            : 'A stock item with that name already exists',
        );
      }
      throw err;
    }
  }
}
