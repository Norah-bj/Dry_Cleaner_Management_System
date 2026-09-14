import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order, OrderStatus } from './order.entity';

@Entity('order_status_history')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    name: 'previous_status',
    nullable: true,
  })
  previousStatus: OrderStatus | null;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    name: 'new_status',
  })
  newStatus: OrderStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', name: 'changed_by_user_id', nullable: true })
  changedByUserId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
