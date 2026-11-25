import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CheckCircle2, CircleDollarSign, ClipboardList, PackageCheck, Truck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { BarChart } from '../../components/ui/BarChart';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError } from '../../components/ui/LoadError';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { cn } from '../../lib/cn';
import { errorMessage } from '../../lib/error-message';
import { getDashboard, type AttentionReason, type DashboardSummary } from '../../services/reports';
import { useAuth } from '../auth/use-auth';
import { SetupChecklist } from './SetupChecklist';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

const STAGES: { key: string; label: string }[] = [
  { key: 'RECEIVED', label: 'Received' },
  { key: 'SORTING', label: 'Sorting' },
  { key: 'WASHING', label: 'Washing' },
  { key: 'DRYING', label: 'Drying' },
  { key: 'IRONING', label: 'Ironing' },
  { key: 'QUALITY_CHECK', label: 'QC' },
  { key: 'PACKING', label: 'Packing' },
];

const REASONS: Record<AttentionReason, { label: string; style: string }> = {
  OVERDUE: { label: 'Overdue', style: 'bg-rose-100 text-rose-800' },
  DUE_TODAY: { label: 'Due today', style: 'bg-amber-100 text-amber-800' },
  READY: { label: 'Ready for collection', style: 'bg-emerald-100 text-emerald-800' },
  DELIVERY_FAILED: { label: 'Delivery failed', style: 'bg-rose-100 text-rose-800' },
};

const rwf = (n: number | null) => (n === null ? '—' : `${n.toLocaleString()} RWF`);

/** "What's happening at EBENEZER right now?" (PAGES.md §1), from live data. */
export function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.fullName.split(' ')[0];
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await getDashboard());
    } catch (err) {
      setError(errorMessage(err, "load today's numbers"));
    }
  }, []);

  useEffect(() => {
    void load();
    // Keep it current while it sits open on the shop PC.
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  const canCreate = user?.role !== 'laundry_staff';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}.`}
        description="Here's what's happening at EBENEZER today."
        action={
          <div className="flex flex-col items-end gap-2">
            <p className="text-sm text-text-muted">{dateFormatter.format(new Date())}</p>
            {canCreate && (
              <div className="flex gap-2">
                <Link to="/customers/new"><Button size="sm" variant="secondary">+ Customer</Button></Link>
                <Link to="/orders/new"><Button size="sm">+ New Order</Button></Link>
              </div>
            )}
          </div>
        }
      />

      {(user?.role === 'super_admin' || user?.role === 'manager') && <SetupChecklist />}
      {error && <LoadError message={error} onRetry={() => void load()} />}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={ClipboardList} label="Today's Orders" value={data ? String(data.todayOrders) : '…'} />
        {data?.showsMoney !== false && <StatCard icon={CircleDollarSign} label="Today's Revenue" value={data ? rwf(data.todayRevenue) : '…'} />}
        <StatCard icon={PackageCheck} label="Ready" value={data ? String(data.ready) : '…'} hint={data ? `${data.readyUnpaid} not fully paid` : undefined} />
        {data?.showsMoney !== false && (
          <StatCard icon={CircleDollarSign} label="Outstanding" value={data ? rwf(data.outstanding) : '…'} hint={data?.owingCustomers !== null && data ? `${data.owingCustomers} customers` : undefined} />
        )}
      </div>

      <Card>
        <h2 className="mb-3 text-base font-semibold">Laundry flow</h2>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
          {STAGES.map((stage) => (
            <Link key={stage.key} to="/laundry" className="rounded-md p-2 text-center hover:bg-primary-light">
              <p className="text-lg font-semibold text-text">{data ? data.stageCounts[stage.key] ?? 0 : '…'}</p>
              <p className="text-xs text-text-muted">{stage.label}</p>
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Needs attention</h2>
          <Link to="/orders" className="text-xs text-primary hover:underline">View all orders →</Link>
        </div>
        {!data || data.needsAttention.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={data ? 'Nothing needs attention' : 'Loading…'}
            description={data ? 'Orders that are overdue, due today, ready for collection, or whose delivery failed show up here.' : undefined}
          />
        ) : (
          <ul className="divide-y divide-border">
            {data.needsAttention.map((o) => (
              <li key={`${o.reason}-${o.orderId}`}>
                <Link to={`/orders/${o.orderId}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm hover:bg-border/10">
                  <span className="min-w-0">
                    <span className="font-mono text-xs font-bold text-primary">{o.orderNumber}</span>{' '}
                    <span className="text-text">{o.customer}</span>
                    {o.items > 0 && <span className="text-xs text-text-muted"> · {o.items} items</span>}
                    {o.unpaid && <span className="text-xs text-rose-700"> · unpaid balance</span>}
                  </span>
                  <span className="flex items-center gap-2 text-xs">
                    {o.expectedCompletion && (
                      <span className="text-text-muted">
                        {new Date(o.expectedCompletion).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <span className={cn('rounded px-2 py-0.5 font-medium', REASONS[o.reason].style)}>{REASONS[o.reason].label}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {([
          ['Today’s pickups', data?.todayPickups, Truck, 'No pickups scheduled for today.'],
          ['Today’s deliveries', data?.todayDeliveries, CheckCircle2, 'No deliveries scheduled for today.'],
        ] as const).map(([title, rows, Icon, empty]) => (
          <Card key={title}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">{title}</h2>
              <Link to="/pickup-delivery" className="text-xs text-primary hover:underline">View →</Link>
            </div>
            {!rows || rows.length === 0 ? (
              <EmptyState icon={Icon} title={rows ? empty : 'Loading…'} />
            ) : (
              <ul className="space-y-1.5 text-sm">
                {rows.map((r) => (
                  <li key={r.id} className="flex justify-between gap-2">
                    <span className="truncate">{r.customer}</span>
                    <span className="whitespace-nowrap text-xs text-text-muted">{r.time_slot ?? 'any time'} · {r.status.replace(/_/g, ' ').toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      {data?.revenueLast7Days && (
        <Card>
          <h2 className="mb-3 text-base font-semibold">Revenue, last 7 days</h2>
          {data.revenueLast7Days.every((d) => d.total === 0) ? (
            <EmptyState icon={BarChart3} title="No payments in the last 7 days" />
          ) : (
            <BarChart
              data={data.revenueLast7Days.map((d) => ({
                label: new Date(`${d.day}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' }),
                title: d.day,
                value: d.total,
              }))}
              format={(n) => `${n.toLocaleString()} RWF`}
            />
          )}
        </Card>
      )}
    </div>
  );
}
