import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Fixed set per docs/requirements/REQUIREMENTS.md - not a separate
 * roles/permissions table in Phase 1 (see docs/architecture/ARCHITECTURE.md
 * note on the `roles/` module). Revisit if dynamic role management
 * becomes an actual requirement.
 */
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  MANAGER = 'manager',
  RECEPTIONIST = 'receptionist',
  CASHIER = 'cashier',
  LAUNDRY_STAFF = 'laundry_staff',
  DRIVER = 'driver',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
