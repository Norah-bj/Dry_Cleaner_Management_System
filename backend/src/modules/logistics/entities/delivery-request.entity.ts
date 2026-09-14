import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

export enum DeliveryStatus {
  SCHEDULED = 'SCHEDULED',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('delivery_requests')
export class DeliveryRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'delivery_number', unique: true })
  deliveryNumber: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'delivery_address' })
  deliveryAddress: string;

  @Column({ type: 'date', name: 'scheduled_date' })
  scheduledDate: string;

  @Column({ name: 'time_slot', default: 'Morning (08:00 - 12:00)' })
  timeSlot: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'amount_collectable',
    default: 0,
  })
  amountCollectable: number;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.SCHEDULED,
  })
  status: DeliveryStatus;

  @Column({ type: 'varchar', name: 'assigned_driver_id', nullable: true })
  assignedDriverId: string | null;

  @Column({ type: 'varchar', name: 'assigned_driver_name', nullable: true })
  assignedDriverName: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
