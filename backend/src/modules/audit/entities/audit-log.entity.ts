import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Append-only record of sensitive actions (payments, status changes,
 * order edits, staff/role changes, settings and price changes). Rows are
 * never updated or deleted by the application.
 */
@Entity('audit_logs')
@Index('IDX_audit_logs_created', ['createdAt'])
@Index('IDX_audit_logs_entity', ['entityType', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null;

  /** Name at the time of the action, so the log reads correctly even if the user is renamed. */
  @Column({ name: 'actor_name', type: 'varchar', nullable: true })
  actorName: string | null;

  /** Machine-readable, e.g. "payment.recorded", "user.role_changed". */
  @Column({ type: 'varchar' })
  action: string;

  @Column({ name: 'entity_type', type: 'varchar' })
  entityType: string;

  @Column({ name: 'entity_id', type: 'varchar', nullable: true })
  entityId: string | null;

  /** One plain sentence for the owner to read. */
  @Column({ type: 'varchar' })
  summary: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
