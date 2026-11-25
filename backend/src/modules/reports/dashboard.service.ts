import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserRole } from '../users/entities/user.entity';
import {
  addDays,
  bind,
  businessTimezone,
  localTs,
  todayLocal,
} from './local-time';

type Row = Record<string, string | number | null>;
const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

/** Roles that see money on the dashboard (per the PAGES.md payments/reports matrix). */
const SEES_MONEY: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.MANAGER,
  UserRole.CASHIER,
  UserRole.RECEPTIONIST,
];

const ACTIVE_STAGES = [
  'RECEIVED',
  'SORTING',
  'WASHING',
  'DRYING',
  'IRONING',
  'QUALITY_CHECK',
  'PACKING',
  'READY',
];

export type AttentionReason =
  'OVERDUE' | 'DUE_TODAY' | 'READY' | 'DELIVERY_FAILED';

/** "What's happening at EBENEZER right now?" (docs/design/PAGES.md §1). */
@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  private async q(
    sql: string,
    params: Record<string, unknown> = {},
  ): Promise<Row[]> {
    const [text, values] = bind(sql, { tz: businessTimezone(), ...params });
    return this.dataSource.query<Row[]>(text, values);
  }

  async summary(role: UserRole) {
    const today = todayLocal();
    const weekStart = addDays(today, -6);
    const isToday = (col: string) => `${localTs(col)}::date = $today::date`;
    const money = SEES_MONEY.includes(role);

    const [orders] = await this.q(
      `SELECT count(*) FILTER (WHERE ${isToday('created_at')} AND status <> 'CANCELLED') today,
              count(*) FILTER (WHERE status = 'READY') ready,
              count(*) FILTER (WHERE status = 'READY' AND balance > 0) ready_unpaid,
              coalesce(sum(balance) FILTER (WHERE status <> 'CANCELLED' AND balance > 0),0) outstanding,
              count(DISTINCT customer_id) FILTER (WHERE status <> 'CANCELLED' AND balance > 0) owing_customers
       FROM orders`,
      { today },
    );

    const stages = await this.q(
      `SELECT status, count(*) n FROM orders WHERE status = ANY($stages) GROUP BY status`,
      { stages: ACTIVE_STAGES },
    );
    const stageCounts = Object.fromEntries(ACTIVE_STAGES.map((s) => [s, 0]));
    for (const r of stages) stageCounts[String(r.status)] = num(r.n);

    const [revenueToday] = await this.q(
      `SELECT coalesce(sum(amount),0) total FROM payments
       WHERE status = 'COMPLETED' AND ${isToday('created_at')}`,
      { today },
    );
    const week = await this.q(
      `SELECT ${localTs('created_at')}::date::text AS day, sum(amount) total FROM payments
       WHERE status = 'COMPLETED' AND ${localTs('created_at')}::date BETWEEN $from::date AND $today::date
       GROUP BY 1`,
      { from: weekStart, today },
    );
    const weekMap = new Map(week.map((r) => [String(r.day), num(r.total)]));

    // Orders needing action. A due date is only known if staff set one.
    const attention = await this.q(
      `SELECT o.id, o.order_number, c.name customer, o.status, o.service_tier, o.expected_completion, o.balance,
              (SELECT coalesce(sum(quantity),0) FROM order_items WHERE order_id = o.id) items,
              CASE
                WHEN o.status NOT IN ('READY','DELIVERED','CANCELLED') AND o.expected_completion < now() THEN 'OVERDUE'
                WHEN o.status NOT IN ('READY','DELIVERED','CANCELLED') AND ${localTs('o.expected_completion', true)}::date = $today::date THEN 'DUE_TODAY'
                WHEN o.status = 'READY' THEN 'READY'
              END reason
       FROM orders o JOIN customers c ON c.id = o.customer_id
       WHERE o.status = 'READY'
          OR (o.status NOT IN ('DELIVERED','CANCELLED') AND o.expected_completion IS NOT NULL
              AND ${localTs('o.expected_completion', true)}::date <= $today::date)
       ORDER BY CASE WHEN o.expected_completion < now() THEN 0 ELSE 1 END, o.expected_completion NULLS LAST, o.created_at
       LIMIT 10`,
      { today },
    );
    const failed = await this.q(
      `SELECT d.id, o.id order_id, o.order_number, c.name customer
       FROM delivery_requests d JOIN orders o ON o.id = d.order_id JOIN customers c ON c.id = o.customer_id
       WHERE d.status = 'FAILED' AND d.scheduled_date >= $from::date ORDER BY d.scheduled_date DESC LIMIT 5`,
      { from: weekStart },
    );

    const pickups = await this.q(
      `SELECT p.id, p.pickup_number reference, p.time_slot, p.status, c.name customer
       FROM pickup_requests p JOIN customers c ON c.id = p.customer_id
       WHERE p.scheduled_date = $today::date AND p.status NOT IN ('PICKED_UP','CANCELLED')
       ORDER BY p.time_slot NULLS LAST`,
      { today },
    );
    const deliveries = await this.q(
      `SELECT d.id, d.delivery_number reference, d.time_slot, d.status, c.name customer
       FROM delivery_requests d JOIN orders o ON o.id = d.order_id JOIN customers c ON c.id = o.customer_id
       WHERE d.scheduled_date = $today::date AND d.status NOT IN ('DELIVERED','CANCELLED','FAILED')
       ORDER BY d.time_slot NULLS LAST`,
      { today },
    );

    return {
      date: today,
      timezone: businessTimezone(),
      showsMoney: money,
      todayOrders: num(orders.today),
      ready: num(orders.ready),
      readyUnpaid: num(orders.ready_unpaid),
      todayRevenue: money ? num(revenueToday.total) : null,
      outstanding: money ? num(orders.outstanding) : null,
      owingCustomers: money ? num(orders.owing_customers) : null,
      stageCounts,
      needsAttention: [
        ...attention.map((r) => ({
          orderId: String(r.id),
          orderNumber: String(r.order_number),
          customer: String(r.customer),
          items: num(r.items),
          status: String(r.status),
          serviceTier: String(r.service_tier),
          expectedCompletion: r.expected_completion,
          unpaid: num(r.balance) > 0,
          reason: (r.reason ?? 'READY') as AttentionReason,
        })),
        ...failed.map((r) => ({
          orderId: String(r.order_id),
          orderNumber: String(r.order_number),
          customer: String(r.customer),
          items: 0,
          status: 'DELIVERY_FAILED',
          serviceTier: '',
          expectedCompletion: null,
          unpaid: false,
          reason: 'DELIVERY_FAILED',
        })),
      ],
      todayPickups: pickups,
      todayDeliveries: deliveries,
      revenueLast7Days: money
        ? Array.from({ length: 7 }, (_, i) => {
            const day = addDays(weekStart, i);
            return { day, total: weekMap.get(day) ?? 0 };
          })
        : null,
    };
  }
}
