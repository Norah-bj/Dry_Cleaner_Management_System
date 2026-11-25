import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MaterialType } from '../../orders/entities/order-material.entity';

/** decimal columns come back from Postgres as strings; expose numbers. */
export const decimalNumber = {
  to: (v: number | null | undefined) => v,
  from: (v: string | null) => (v === null ? null : Number(v)),
};

/**
 * A stock item (detergent, hangers, covers...). `stockQuantity` is changed
 * only together with an InventoryTransaction row, and can never go below
 * zero (business rule #6). Items are deactivated, never deleted, so their
 * history stays readable.
 */
@Entity('inventory_items')
@Check('CHK_inventory_items_stock_non_negative', '"stock_quantity" >= 0')
@Check(
  'CHK_inventory_items_minimum_non_negative',
  'coalesce("minimum_stock", 0) >= 0',
)
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  category: string | null;

  /** How the item is counted, e.g. "pcs", "litres", "kg". */
  @Column({ type: 'varchar', default: 'pcs' })
  unit: string;

  @Column({
    name: 'stock_quantity',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalNumber,
  })
  stockQuantity: number;

  /** At or below this level the item shows as "Low". Null = no alert. */
  @Column({
    name: 'minimum_stock',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalNumber,
  })
  minimumStock: number | null;

  @Column({ type: 'varchar', nullable: true })
  supplier: string | null;

  /**
   * If set, every order that uses this packaging material (and the customer
   * didn't bring their own) takes it out of this item's stock.
   */
  @Column({
    name: 'material_type',
    type: 'enum',
    enum: MaterialType,
    enumName: 'order_materials_material_type_enum',
    nullable: true,
    unique: true,
  })
  materialType: MaterialType | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export type StockStatus = 'GOOD' | 'LOW' | 'OUT';

export function stockStatus(item: InventoryItem): StockStatus {
  if (item.stockQuantity <= 0) return 'OUT';
  if (item.minimumStock !== null && item.stockQuantity <= item.minimumStock)
    return 'LOW';
  return 'GOOD';
}
