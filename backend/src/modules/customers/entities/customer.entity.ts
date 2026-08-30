import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * Per docs/requirements/BUSINESS-RULES.md #9: customer_number is unique
 * and is the primary reference on the customer's paper/receipt.
 */
@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_number', unique: true })
  customerNumber: string;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column({ type: 'varchar', name: 'alternative_phone', nullable: true })
  alternativePhone: string | null;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @Column({
    type: 'enum',
    enum: CustomerStatus,
    default: CustomerStatus.ACTIVE,
  })
  status: CustomerStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
