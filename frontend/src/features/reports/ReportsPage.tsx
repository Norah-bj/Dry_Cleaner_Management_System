import { useCallback, useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { BarChart, BarList } from '../../components/ui/BarChart';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadError } from '../../components/ui/LoadError';
import { PageHeader } from '../../components/ui/PageHeader';
import { cn } from '../../lib/cn';
import { errorMessage } from '../../lib/error-message';
import { downloadReport, getReportSummary, type ExportDataset, type ReportSummary } from '../../services/reports';
import { PAYMENT_METHOD_LABELS, TIER_LABELS, type ApiPaymentMethod, type ApiServiceTier } from '../../types/settings';

type Preset = 'today' | 'week' | 'month' | 'lastMonth' | 'custom';

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Last 7 days' },
  { id: 'month', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'custom', label: 'Custom' },
];

const EXPORTS: { id: ExportDataset; label: string }[] = [
  { id: 'payments', label: 'Payments' },
  { id: 'orders', label: 'Orders' },
  { id: 'customers', label: 'New customers' },
  { id: 'inventory', label: 'Stock movements' },
];

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const rwf = (n: number) => `${n.toLocaleString()} RWF`;
const label = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

function rangeFor(preset: Exclude<Preset, 'custom'>): { from: string; to: string } {
  const now = new Date();
  if (preset === 'today') return { from: iso(now), to: iso(now) };
  if (preset === 'week') return { from: iso(new Date(now.getTime() - 6 * 86_400_000)), to: iso(now) };
  if (preset === 'month') return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
  return {
    from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    to: iso(new Date(now.getFullYear(), now.getMonth(), 0)),
  };
}

function Stat({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="mb-1 text-xs text-text-muted">{title}</div>
      <div className="text-xl font-bold text-text">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-text-muted">{hint}</div>}
    </Card>
  );
}

/** "How is the business performing?" (PAGES.md §12) - every number from real records. */
export function ReportsPage() {
  const [preset, setPreset] = useState<Preset>('month');
  const [range, setRange] = useState(() => rangeFor('month'));
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<ExportDataset | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getReportSummary(range.from, range.to));
    } catch (err) {
      setError(errorMessage(err, 'load the report'));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const choose = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') setRange(rangeFor(p));
  };

  const exportCsv = async (dataset: ExportDataset) => {
    setExporting(dataset);
    setError(null);
    try {
      await downloadReport(dataset, range.from, range.to);
    } catch (err) {
      setError(errorMessage(err, 'download the export'));
    } finally {
      setExporting(null);
    }
  };

  const periodLabel =
    range.from === range.to
      ? new Date(`${range.from}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : `${new Date(`${range.from}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(`${range.to}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="How is the business performing?"
        action={
          <Button variant="secondary" onClick={() => window.print()} disabled={!data}>
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </Button>
        }
      />

      <Card className="no-print flex flex-wrap items-end gap-3 p-4">
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => choose(p.id)}
              className={cn('rounded-full border px-3 py-1 text-xs font-medium', preset === p.id ? 'border-primary bg-primary-light text-primary' : 'border-border text-text-muted hover:bg-border/20')}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex items-end gap-2 text-xs">
            <label>From<input type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} className="mt-1 block rounded border border-border px-2 py-1" /></label>
            <label>To<input type="date" value={range.to} min={range.from} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} className="mt-1 block rounded border border-border px-2 py-1" /></label>
          </div>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted">Download (opens in Excel):</span>
          {EXPORTS.map((e) => (
            <Button key={e.id} size="sm" variant="ghost" disabled={exporting !== null} onClick={() => void exportCsv(e.id)}>
              <Download className="h-3.5 w-3.5" /> {exporting === e.id ? 'Preparing…' : e.label}
            </Button>
          ))}
        </div>
      </Card>

      {error && <LoadError message={error} onRetry={() => void load()} />}

      {!data ? (
        <p className="text-sm text-text-muted">{loading ? 'Loading report…' : ''}</p>
      ) : (
        <div className={cn('print-area space-y-6', loading && 'opacity-60')}>
          <div>
            <h2 className="text-base font-semibold text-text">Report: {periodLabel}</h2>
            <p className="text-[11px] text-text-muted">All amounts in RWF. Days are counted in {data.timezone.replace('_', ' ')} time.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat title="Money received" value={rwf(data.revenue.total)} hint={`${data.revenue.payments} payments`} />
            <Stat title="Orders" value={String(data.orders.count)} hint={`worth ${rwf(data.orders.value)} · avg ${rwf(data.orders.averageValue)}`} />
            <Stat title="New customers" value={String(data.customers.new)} hint={`${data.customers.total} in total`} />
            <Stat title="Owed to the shop (now)" value={rwf(data.outstanding.total)} hint={`${data.outstanding.orders} orders · ${data.outstanding.customers} customers`} />
          </div>

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Money received per day</h3>
            {data.revenue.byDay.length > 62 ? (
              <p className="text-xs text-text-muted">Pick a shorter period (up to 2 months) to see daily bars.</p>
            ) : (
              <BarChart
                data={data.revenue.byDay.map((d) => ({
                  label: new Date(`${d.day}T12:00:00`).toLocaleDateString('en-GB', data.revenue.byDay.length > 7 ? { day: 'numeric' } : { weekday: 'short' }),
                  title: d.day,
                  value: d.total,
                }))}
                format={rwf}
              />
            )}
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold">By payment method</h3>
              <BarList rows={data.revenue.byMethod.map((m) => ({ label: PAYMENT_METHOD_LABELS[m.method as ApiPaymentMethod] ?? m.method, value: m.total, detail: `${m.count}×` }))} format={rwf} empty="No payments in this period." />
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold">Orders by speed</h3>
              <BarList rows={data.orders.byTier.map((t) => ({ label: TIER_LABELS[t.tier as ApiServiceTier] ?? t.tier, value: t.count, detail: rwf(t.value) }))} empty="No orders in this period." />
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold">Most-cleaned items</h3>
              <BarList rows={data.orders.topItems.map((i) => ({ label: i.item, value: i.quantity, detail: rwf(i.value) }))} empty="No orders in this period." />
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold">Orders by current status</h3>
              <BarList rows={data.orders.byStatus.map((s) => ({ label: label(s.status), value: s.count }))} empty="No orders in this period." />
              {data.orders.discounts > 0 && <p className="mt-3 text-xs text-text-muted">Discounts given: {rwf(data.orders.discounts)}</p>}
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold">Stock</h3>
              <p className="mb-3 text-xs text-text-muted">
                Spent on purchases: <strong className="text-text">{rwf(data.inventory.purchasesCost)}</strong> ({data.inventory.purchases} purchases) ·
                Now low: <strong className="text-text">{data.inventory.lowStock}</strong> · Out: <strong className="text-text">{data.inventory.outOfStock}</strong>
              </p>
              <BarList rows={data.inventory.topUsage.map((u) => ({ label: u.item, value: u.used, detail: u.unit }))} empty="No stock used in this period." />
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold">Pickups and deliveries</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-2 text-xs font-medium text-text-muted">Pickups</p>
                  <BarList rows={data.logistics.pickups.map((p) => ({ label: label(p.status), value: p.count }))} empty="None scheduled." />
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-text-muted">Deliveries</p>
                  <BarList rows={data.logistics.deliveries.map((d) => ({ label: label(d.status), value: d.count }))} empty="None scheduled." />
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
