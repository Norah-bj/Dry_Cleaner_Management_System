import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  addDays,
  bind,
  businessTimezone,
  localTs,
  todayLocal,
} from './local-time';

export interface DateRange {
  from: string; // YYYY-MM-DD, inclusive, business time zone
  to: string; // YYYY-MM-DD, inclusive
}

type Row = Record<string, string | number | null>;

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

/** Longest range a report covers in one go (keeps queries and exports bounded). */
const MAX_RANGE_DAYS = 366;

/** Datasets that can be exported as CSV. */
export const EXPORT_DATASETS = [
  'payments',
  'orders',
  'customers',
  'inventory',
] as const;
export type ExportDataset = (typeof EXPORT_DATASETS)[number];

/**
 * Read-only reporting over real data. Every figure is computed from the
 * ledgers (payments, orders, inventory transactions), never stored, so
 * reports can't drift from the records. Days are business-time-zone days.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly dataSource: DataSource) {}

  private async q(
    sql: string,
    params: Record<string, unknown> = {},
  ): Promise<Row[]> {
    const [text, values] = bind(sql, { tz: businessTimezone(), ...params });
    return this.dataSource.query<Row[]>(text, values);
  }

  normalizeRange(from?: string, to?: string): DateRange {
    const today = todayLocal();
    const range = { from: from ?? today, to: to ?? today };
    const valid = (d: string) =>
      /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
    if (!valid(range.from) || !valid(range.to)) {
      throw new BadRequestException('Dates must be YYYY-MM-DD');
    }
    if (range.from > range.to)
      throw new BadRequestException('"from" is after "to"');
    if (
      Date.parse(range.to) - Date.parse(range.from) >
      MAX_RANGE_DAYS * 86_400_000
    ) {
      throw new BadRequestException(
        `A report can cover at most ${MAX_RANGE_DAYS} days`,
      );
    }
    return range;
  }

  /** The Reports page: one call, everything for the chosen period. */
  async summary(range: DateRange) {
    const p = { from: range.from, to: range.to };
    const inRange = (col: string, tz = false) =>
      `${localTs(col, tz)}::date BETWEEN $from::date AND $to::date`;

    const [revenue] = await this.q(
      `SELECT coalesce(sum(amount),0) total, count(*) payments
       FROM payments WHERE status = 'COMPLETED' AND ${inRange('created_at')}`,
      p,
    );
    const byMethod = await this.q(
      `SELECT payment_method method, sum(amount) total, count(*) n
       FROM payments WHERE status = 'COMPLETED' AND ${inRange('created_at')}
       GROUP BY payment_method ORDER BY total DESC`,
      p,
    );
    const byDay = await this.q(
      `SELECT ${localTs('created_at')}::date::text AS day, sum(amount) total
       FROM payments WHERE status = 'COMPLETED' AND ${inRange('created_at')}
       GROUP BY 1 ORDER BY 1`,
      p,
    );

    const [orders] = await this.q(
      `SELECT count(*) n, coalesce(sum(total),0) value, coalesce(sum(discount),0) discounts
       FROM orders WHERE status <> 'CANCELLED' AND ${inRange('created_at')}`,
      p,
    );
    const byTier = await this.q(
      `SELECT service_tier tier, count(*) n, sum(total) value
       FROM orders WHERE status <> 'CANCELLED' AND ${inRange('created_at')}
       GROUP BY service_tier ORDER BY n DESC`,
      p,
    );
    const byStatus = await this.q(
      `SELECT status, count(*) n FROM orders WHERE ${inRange('created_at')}
       GROUP BY status ORDER BY n DESC`,
      p,
    );
    const topItems = await this.q(
      `SELECT i.garment_name item, sum(i.quantity) quantity, sum(i.line_total) value
       FROM order_items i JOIN orders o ON o.id = i.order_id
       WHERE o.status <> 'CANCELLED' AND ${inRange('o.created_at')}
       GROUP BY i.garment_name ORDER BY quantity DESC LIMIT 10`,
      p,
    );

    const [customers] = await this.q(
      `SELECT count(*) FILTER (WHERE ${inRange('created_at')}) new_customers, count(*) total
       FROM customers`,
      p,
    );
    const [outstanding] = await this.q(
      `SELECT coalesce(sum(balance),0) total, count(DISTINCT customer_id) customers, count(*) orders
       FROM orders WHERE status <> 'CANCELLED' AND balance > 0`,
    );

    const [stockSpend] = await this.q(
      `SELECT coalesce(sum(quantity_change * unit_cost),0) spent, count(*) purchases
       FROM inventory_transactions WHERE type = 'PURCHASE' AND ${inRange('created_at')}`,
      p,
    );
    const stockUsed = await this.q(
      `SELECT it.name item, it.unit unit, -sum(t.quantity_change) used
       FROM inventory_transactions t JOIN inventory_items it ON it.id = t.inventory_item_id
       WHERE t.type = 'USAGE' AND ${inRange('t.created_at')}
       GROUP BY it.name, it.unit ORDER BY used DESC LIMIT 10`,
      p,
    );
    const [stockAlerts] = await this.q(
      `SELECT count(*) FILTER (WHERE stock_quantity <= 0) out_of_stock,
              count(*) FILTER (WHERE stock_quantity > 0 AND minimum_stock IS NOT NULL AND stock_quantity <= minimum_stock) low
       FROM inventory_items WHERE is_active`,
    );

    const pickups = await this.q(
      `SELECT status, count(*) n FROM pickup_requests
       WHERE scheduled_date BETWEEN $from::date AND $to::date GROUP BY status`,
      p,
    );
    const deliveries = await this.q(
      `SELECT status, count(*) n, coalesce(sum(amount_collectable),0) collectable FROM delivery_requests
       WHERE scheduled_date BETWEEN $from::date AND $to::date GROUP BY status`,
      p,
    );

    const orderCount = num(orders.n);
    return {
      range,
      timezone: businessTimezone(),
      revenue: {
        total: num(revenue.total),
        payments: num(revenue.payments),
        byMethod: byMethod.map((r) => ({
          method: r.method,
          total: num(r.total),
          count: num(r.n),
        })),
        byDay: this.fillDays(range, byDay),
      },
      orders: {
        count: orderCount,
        value: num(orders.value),
        averageValue: orderCount
          ? Math.round(num(orders.value) / orderCount)
          : 0,
        discounts: num(orders.discounts),
        byTier: byTier.map((r) => ({
          tier: r.tier,
          count: num(r.n),
          value: num(r.value),
        })),
        byStatus: byStatus.map((r) => ({ status: r.status, count: num(r.n) })),
        topItems: topItems.map((r) => ({
          item: r.item,
          quantity: num(r.quantity),
          value: num(r.value),
        })),
      },
      customers: {
        new: num(customers.new_customers),
        total: num(customers.total),
      },
      outstanding: {
        total: num(outstanding.total),
        customers: num(outstanding.customers),
        orders: num(outstanding.orders),
      },
      inventory: {
        purchasesCost: num(stockSpend.spent),
        purchases: num(stockSpend.purchases),
        topUsage: stockUsed.map((r) => ({
          item: r.item,
          unit: r.unit,
          used: num(r.used),
        })),
        lowStock: num(stockAlerts.low),
        outOfStock: num(stockAlerts.out_of_stock),
      },
      logistics: {
        pickups: pickups.map((r) => ({ status: r.status, count: num(r.n) })),
        deliveries: deliveries.map((r) => ({
          status: r.status,
          count: num(r.n),
          collectable: num(r.collectable),
        })),
      },
    };
  }

  private fillDays(range: DateRange, rows: Row[]) {
    const byDay = new Map(rows.map((r) => [String(r.day), num(r.total)]));
    const out: { day: string; total: number }[] = [];
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
      out.push({ day: d, total: byDay.get(d) ?? 0 });
    }
    return out;
  }

  /** Rows for a CSV export; header names are what the owner sees in Excel. */
  async exportRows(dataset: ExportDataset, range: DateRange): Promise<Row[]> {
    const p = { from: range.from, to: range.to };
    const inRange = (col: string) =>
      `${localTs(col)}::date BETWEEN $from::date AND $to::date`;
    const when = (col: string) =>
      `to_char(${localTs(col)}, 'YYYY-MM-DD HH24:MI')`;
    switch (dataset) {
      case 'payments':
        return this.q(
          `SELECT ${when('p.created_at')} "Date", p.receipt_number "Receipt", o.order_number "Order",
                  c.name "Customer", c.phone "Phone", p.payment_method "Method", p.amount "Amount (RWF)",
                  p.reference_number "Reference", u.full_name "Received by"
           FROM payments p JOIN orders o ON o.id = p.order_id JOIN customers c ON c.id = o.customer_id
           LEFT JOIN users u ON u.id = p.received_by_user_id
           WHERE p.status = 'COMPLETED' AND ${inRange('p.created_at')} ORDER BY p.created_at`,
          p,
        );
      case 'orders':
        return this.q(
          `SELECT ${when('o.created_at')} "Date", o.order_number "Order", c.customer_number "Customer no.",
                  c.name "Customer", c.phone "Phone", o.service_tier "Speed", o.status "Status",
                  (SELECT coalesce(sum(quantity),0) FROM order_items WHERE order_id = o.id) "Items",
                  o.subtotal "Garments (RWF)", o.material_charges "Packaging (RWF)", o.discount "Discount (RWF)",
                  o.total "Total (RWF)", o.amount_paid "Paid (RWF)", o.balance "Balance (RWF)", o.payment_status "Payment"
           FROM orders o JOIN customers c ON c.id = o.customer_id
           WHERE ${inRange('o.created_at')} ORDER BY o.created_at`,
          p,
        );
      case 'customers':
        return this.q(
          `SELECT c.customer_number "Customer no.", c.name "Name", c.phone "Phone", c.address "Address",
                  to_char(${localTs('c.created_at')}, 'YYYY-MM-DD') "Registered",
                  count(o.id) FILTER (WHERE o.status <> 'CANCELLED') "Orders",
                  coalesce(sum(o.total) FILTER (WHERE o.status <> 'CANCELLED'),0) "Spent (RWF)",
                  coalesce(sum(o.balance) FILTER (WHERE o.status <> 'CANCELLED'),0) "Owes (RWF)"
           FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
           WHERE ${inRange('c.created_at')}
           GROUP BY c.id ORDER BY c.created_at`,
          p,
        );
      case 'inventory':
        return this.q(
          `SELECT ${when('t.created_at')} "Date", it.name "Item", t.type "Type", t.quantity_change "Change",
                  t.quantity_after "Stock after", it.unit "Unit", t.unit_cost "Unit cost (RWF)",
                  t.supplier "Supplier", t.notes "Notes", u.full_name "By"
           FROM inventory_transactions t JOIN inventory_items it ON it.id = t.inventory_item_id
           LEFT JOIN users u ON u.id = t.created_by_user_id
           WHERE ${inRange('t.created_at')} ORDER BY t.created_at`,
          p,
        );
    }
  }
}

/**
 * CSV that opens correctly in Excel: UTF-8 BOM, CRLF, quoted fields, and
 * cells starting with = + - @ prefixed with ' so a customer name can never
 * run as a spreadsheet formula (CSV injection).
 */
export function toCsv(rows: Row[], emptyHeader: string[] = []): string {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : emptyHeader;
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return '';
    let s: string;
    if (typeof v === 'string') s = v;
    else if (typeof v === 'number' || typeof v === 'boolean') s = v.toString();
    else if (v instanceof Date) s = v.toISOString();
    else s = JSON.stringify(v);
    if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.map(cell).join(','),
    ...rows.map((r) => headers.map((h) => cell(r[h])).join(',')),
  ];
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}
