import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { OrderItem } from './order-item.entity';
import { OrderMaterial } from './order-material.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { OrderStatus, PaymentStatus, ServiceTier } from '../enums/order-enums';

export { OrderStatus, PaymentStatus, ServiceTier };

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_number', unique: true })
  orderNumber: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({
    type: 'enum',
    enum: ServiceTier,
    name: 'service_tier',
    default: ServiceTier.STANDARD,
  })
  serviceTier: ServiceTier;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.RECEIVED,
  })
  status: OrderStatus;

  @Column({ type: 'varchar', name: 'storage_hanger_id', nullable: true })
  storageHangerId: string | null;

  @Column({ type: 'varchar', name: 'storage_box_id', nullable: true })
  storageBoxId: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'material_charges',
    default: 0,
  })
  materialCharges: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'amount_paid',
    default: 0,
  })
  amountPaid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    name: 'payment_status',
    default: PaymentStatus.UNPAID,
  })
  paymentStatus: PaymentStatus;

  @Column({
    type: 'timestamp with time zone',
    name: 'expected_completion',
    nullable: true,
  })
  expectedCompletion: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', name: 'created_by_user_id', nullable: true })
  createdByUserId: string | null;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  @OneToMany(() => OrderMaterial, (mat) => mat.order, {
    cascade: true,
    eager: true,
  })
  materials: OrderMaterial[];

  @OneToMany(() => OrderStatusHistory, (history) => history.order, {
    cascade: true,
  })
  statusHistory: OrderStatusHistory[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments: Payment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
