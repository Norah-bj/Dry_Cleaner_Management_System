import { BadRequestException } from '@nestjs/common';
import { MaterialType } from '../orders/entities/order-material.entity';
import { InventoryItem, stockStatus } from './entities/inventory-item.entity';
import {
  InventoryTransaction,
  InventoryTransactionType,
} from './entities/inventory-transaction.entity';
import { InventoryService } from './inventory.service';

function makeItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'item-1',
    name: 'Hangers',
    category: null,
    unit: 'pcs',
    stockQuantity: 10,
    minimumStock: 3,
    supplier: null,
    materialType: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('InventoryService', () => {
  let item: InventoryItem;
  let saved: Partial<InventoryTransaction>[];
  let manager: Record<string, jest.Mock>;
  let service: InventoryService;

  beforeEach(() => {
    item = makeItem();
    saved = [];
    manager = {
      findOne: jest.fn(() => Promise.resolve(item)),
      update: jest.fn(
        (_e: unknown, _id: string, patch: Partial<InventoryItem>) => {
          Object.assign(item, patch);
          return Promise.resolve();
        },
      ),
      create: jest.fn((_e: unknown, v: object) => v),
      save: jest.fn((v: Partial<InventoryTransaction>) => {
        saved.push(v);
        return Promise.resolve(v);
      }),
    };
    const dataSource = {
      transaction: jest.fn((cb: (m: typeof manager) => Promise<unknown>) =>
        cb(manager),
      ),
    };
    service = new InventoryService(
      {} as never,
      {} as never,
      dataSource as never,
      { log: jest.fn().mockResolvedValue(undefined) } as never,
    );
  });

  it('adds a purchase to stock and records it in the ledger', async () => {
    await service.record(
      'item-1',
      { type: InventoryTransactionType.PURCHASE, quantity: 5, unitCost: 100 },
      'u1',
    );
    expect(item.stockQuantity).toBe(15);
    expect(saved[0]).toMatchObject({
      type: 'PURCHASE',
      quantityChange: 5,
      quantityAfter: 15,
      unitCost: 100,
      createdByUserId: 'u1',
    });
  });

  it('subtracts usage, and refuses usage that would go below zero (rule #6)', async () => {
    await service.record('item-1', {
      type: InventoryTransactionType.USAGE,
      quantity: 4,
    });
    expect(item.stockQuantity).toBe(6);

    await expect(
      service.record('item-1', {
        type: InventoryTransactionType.USAGE,
        quantity: 7,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(item.stockQuantity).toBe(6);
    expect(saved).toHaveLength(1);
  });

  it('turns a stock count into a signed adjustment', async () => {
    await service.record('item-1', {
      type: InventoryTransactionType.ADJUSTMENT,
      countedQuantity: 7,
      notes: 'Monthly count',
    });
    expect(item.stockQuantity).toBe(7);
    expect(saved[0]).toMatchObject({
      type: 'ADJUSTMENT',
      quantityChange: -3,
      quantityAfter: 7,
      notes: 'Monthly count',
    });
  });

  it('refuses an adjustment that changes nothing', async () => {
    await expect(
      service.record('item-1', {
        type: InventoryTransactionType.ADJUSTMENT,
        countedQuantity: 10,
        notes: 'x',
      }),
    ).rejects.toThrow(/nothing to adjust/);
  });

  it('avoids floating-point drift on decimal quantities', async () => {
    item.stockQuantity = 0.3;
    await service.record('item-1', {
      type: InventoryTransactionType.USAGE,
      quantity: 0.1,
    });
    expect(item.stockQuantity).toBe(0.2);
  });

  it('takes order packaging out of the linked item, skipping customer-provided and untracked materials', async () => {
    item.materialType = MaterialType.HANGER;
    manager.findOne.mockImplementation(
      (_e: unknown, opts: { where: { materialType?: MaterialType } }) =>
        Promise.resolve(
          opts.where.materialType &&
            opts.where.materialType !== MaterialType.HANGER
            ? null
            : item,
        ),
    );
    await service.consumeForOrder(
      manager as never,
      'order-1',
      'ORD-2026-00001',
      [
        {
          materialType: MaterialType.HANGER,
          quantity: 2,
          customerProvided: false,
        },
        {
          materialType: MaterialType.HANGER,
          quantity: 1,
          customerProvided: false,
        },
        {
          materialType: MaterialType.HANGER,
          quantity: 5,
          customerProvided: true,
        },
        {
          materialType: MaterialType.BAG,
          quantity: 1,
          customerProvided: false,
        },
      ],
      'u1',
    );
    expect(item.stockQuantity).toBe(7);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      type: 'USAGE',
      quantityChange: -3,
      orderId: 'order-1',
      notes: 'Used on order ORD-2026-00001',
    });
  });

  it('reports GOOD, LOW and OUT status', () => {
    expect(stockStatus(makeItem({ stockQuantity: 10, minimumStock: 3 }))).toBe(
      'GOOD',
    );
    expect(stockStatus(makeItem({ stockQuantity: 3, minimumStock: 3 }))).toBe(
      'LOW',
    );
    expect(
      stockStatus(makeItem({ stockQuantity: 0, minimumStock: null })),
    ).toBe('OUT');
    expect(
      stockStatus(makeItem({ stockQuantity: 1, minimumStock: null })),
    ).toBe('GOOD');
  });
});
