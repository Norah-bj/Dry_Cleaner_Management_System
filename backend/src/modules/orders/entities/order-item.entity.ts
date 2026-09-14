import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { ServiceTier } from '../enums/order-enums';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'garment_name' })
  garmentName: string;

  @Column({ default: 'Standard' })
  category: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'unit_price',
    default: 0,
  })
  unitPrice: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'line_total',
    default: 0,
  })
  lineTotal: number;

  @Column({
    type: 'enum',
    enum: ServiceTier,
    name: 'service_tier',
    default: ServiceTier.STANDARD,
  })
  serviceTier: ServiceTier;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
