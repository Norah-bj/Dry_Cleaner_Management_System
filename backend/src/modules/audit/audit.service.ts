import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PaginatedResult } from '../../common/types/paginated-result';
import { User } from '../users/entities/user.entity';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditEntry {
  /** Who did it. Omit for system actions (e.g. a public customer request). */
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  details?: Record<string, unknown>;
}

export interface AuditQuery {
  page: number;
  perPage: number;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * Records an entry. Pass the caller's transaction `manager` so the entry
   * is saved (or rolled back) together with the change it describes.
   */
  async log(entry: AuditEntry, manager?: EntityManager): Promise<void> {
    const em = manager ?? this.auditRepository.manager;
    let actorName: string | null = null;
    if (entry.actorId) {
      const actor = await em.findOne(User, {
        where: { id: entry.actorId },
        select: { id: true, fullName: true },
      });
      actorName = actor?.fullName ?? null;
    }
    await em.save(
      AuditLog,
      em.create(AuditLog, {
        actorUserId: entry.actorId ?? null,
        actorName,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        summary: entry.summary,
        details: entry.details ?? null,
      }),
    );
  }

  async list(query: AuditQuery): Promise<PaginatedResult<AuditLog>> {
    const qb = this.auditRepository
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((query.page - 1) * query.perPage)
      .take(query.perPage);
    if (query.entityType)
      qb.andWhere('log.entityType = :t', { t: query.entityType });
    if (query.entityId) qb.andWhere('log.entityId = :e', { e: query.entityId });
    if (query.actorUserId)
      qb.andWhere('log.actorUserId = :a', { a: query.actorUserId });
    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { page: query.page, perPage: query.perPage, total } };
  }
}
