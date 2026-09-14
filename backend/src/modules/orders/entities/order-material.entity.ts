import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

export enum MaterialType {
  BAG = 'BAG',
  COVER = 'COVER',
  HANGER = 'HANGER',
  ENVELOPE = 'ENVELOPE',
}

@Entity('order_materials')
export class OrderMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.materials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({
    type: 'enum',
    enum: MaterialType,
    name: 'material_type',
  })
  materialType: MaterialType;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({
    type: 'boolean',
    name: 'customer_provided',
    default: false,
  })
  customerProvided: boolean;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'unit_charge',
    default: 0,
  })
  unitCharge: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'total_charge',
    default: 0,
  })
  totalCharge: number;
}
