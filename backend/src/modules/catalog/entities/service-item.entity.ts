import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServiceTier } from '../../orders/enums/order-enums';

const money = {
  type: 'decimal' as const,
  precision: 10,
  scale: 2,
  nullable: true,
  transformer: {
    to: (v: number | null | undefined) => v,
    from: (v: string | null) => (v === null ? null : Number(v)),
  },
};

/**
 * One line of the owner's price list (e.g. "Shirt"). A tier price left
 * empty (null) means that speed isn't offered for this item. Items are
 * deactivated, never deleted, so past orders keep their link.
 */
@Entity('service_items')
@Check(
  'CHK_service_items_prices_non_negative',
  'coalesce("price_standard", 0) >= 0 AND coalesce("price_express", 0) >= 0 AND coalesce("price_same_day", 0) >= 0',
)
export class ServiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  category: string | null;

  @Column({ ...money, name: 'price_standard' })
  priceStandard: number | null;

  @Column({ ...money, name: 'price_express' })
  priceExpress: number | null;

  @Column({ ...money, name: 'price_same_day' })
  priceSameDay: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export function priceForTier(
  item: ServiceItem,
  tier: ServiceTier,
): number | null {
  switch (tier) {
    case ServiceTier.EXPRESS:
      return item.priceExpress;
    case ServiceTier.SAME_DAY:
      return item.priceSameDay;
    default:
      return item.priceStandard;
  }
}
