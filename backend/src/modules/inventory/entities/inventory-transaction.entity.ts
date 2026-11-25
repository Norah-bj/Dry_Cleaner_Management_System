import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InventoryItem, decimalNumber } from './inventory-item.entity';
import { Order } from '../../orders/entities/order.entity';

export enum InventoryTransactionType {
  PURCHASE = 'PURCHASE',
  USAGE = 'USAGE',
  ADJUSTMENT = 'ADJUSTMENT',
}

/** Append-only stock ledger: one row per change, never edited. */
@Entity('inventory_transactions')
@Index('IDX_inventory_transactions_item_created', [
  'inventoryItemId',
  'createdAt',
])
export class InventoryTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'inventory_item_id', type: 'uuid' })
  inventoryItemId: string;

  @ManyToOne(() => InventoryItem, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'inventory_item_id',
    foreignKeyConstraintName: 'inventory_transactions_inventory_item_id_fkey',
  })
  item: InventoryItem;

  @Column({ type: 'enum', enum: InventoryTransactionType })
  type: InventoryTransactionType;

  /** Signed: + for purchases and upward counts, - for usage. */
  @Column({
    name: 'quantity_change',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalNumber,
  })
  quantityChange: number;

  @Column({
    name: 'quantity_after',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalNumber,
  })
  quantityAfter: number;

  @Column({
    name: 'unit_cost',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalNumber,
  })
  unitCost: number | null;

  @Column({ type: 'varchar', nullable: true })
  supplier: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string | null;

  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'order_id',
    foreignKeyConstraintName: 'inventory_transactions_order_id_fkey',
  })
  order: Order | null;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
