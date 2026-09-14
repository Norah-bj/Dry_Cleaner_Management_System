import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Order } from '../../orders/entities/order.entity';

export enum PickupStatus {
  REQUESTED = 'REQUESTED',
  SCHEDULED = 'SCHEDULED',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  ON_THE_WAY = 'ON_THE_WAY',
  PICKED_UP = 'PICKED_UP',
  CANCELLED = 'CANCELLED',
}

@Entity('pickup_requests')
export class PickupRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pickup_number', unique: true })
  pickupNumber: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string | null;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order: Order | null;

  @Column({ name: 'pickup_address' })
  pickupAddress: string;

  @Column({ type: 'date', name: 'scheduled_date' })
  scheduledDate: string;

  @Column({ name: 'time_slot', default: 'Morning (08:00 - 12:00)' })
  timeSlot: string;

  @Column({
    type: 'enum',
    enum: PickupStatus,
    default: PickupStatus.REQUESTED,
  })
  status: PickupStatus;

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
