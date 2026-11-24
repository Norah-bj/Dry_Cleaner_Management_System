import {
  Check,
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MaterialType } from '../../orders/entities/order-material.entity';
import { PaymentMethod } from '../../payments/entities/payment.entity';
import { UserRole } from '../../users/entities/user.entity';

export interface OpeningHoursDay {
  /** 0 = Sunday ... 6 = Saturday */
  day: number;
  closed: boolean;
  open?: string; // "07:30"
  close?: string; // "19:00"
}

/** Plain-language turnaround the owner promises per service speed. */
export interface Turnaround {
  STANDARD?: string;
  EXPRESS?: string;
  SAME_DAY?: string;
}

/**
 * Single-row table (id is always 1). Every value the client owns - payment
 * methods, material charges, hours, time windows, discount policy - lives
 * here and is edited by the owner in Settings, never hard-coded.
 */
@Entity('business_settings')
@Check('CHK_business_settings_single_row', '"id" = 1')
export class BusinessSettings {
  @PrimaryColumn({ type: 'integer', default: 1 })
  id: number;

  @Column({ name: 'business_name', type: 'varchar' })
  businessName: string;

  @Column({ name: 'owner_name', type: 'varchar', nullable: true })
  ownerName: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ name: 'whatsapp_number', type: 'varchar', nullable: true })
  whatsappNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', nullable: true })
  tin: string | null;

  @Column({ name: 'opening_hours', type: 'jsonb', default: () => "'[]'" })
  openingHours: OpeningHoursDay[];

  @Column({ name: 'time_slots', type: 'jsonb', default: () => "'[]'" })
  timeSlots: string[];

  @Column({
    name: 'enabled_payment_methods',
    type: 'jsonb',
    default: () => "'[]'",
  })
  enabledPaymentMethods: PaymentMethod[];

  /** Charge per unit; a type that is missing has not been set by the owner. */
  @Column({ name: 'material_charges', type: 'jsonb', default: () => "'{}'" })
  materialCharges: Partial<Record<MaterialType, number>>;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  turnaround: Turnaround;

  @Column({ name: 'allow_discounts', type: 'boolean', default: false })
  allowDiscounts: boolean;

  @Column({ name: 'discount_roles', type: 'jsonb', default: () => "'[]'" })
  discountRoles: UserRole[];

  @Column({ name: 'receipt_footer', type: 'varchar', nullable: true })
  receiptFooter: string | null;

  @Column({ name: 'updated_by_user_id', type: 'uuid', nullable: true })
  updatedByUserId: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
