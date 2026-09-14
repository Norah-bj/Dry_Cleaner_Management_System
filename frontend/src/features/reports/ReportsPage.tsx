import { useState } from 'react';
import { BarChart3, TrendingUp, Package, Users, ShoppingBag, Download } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { mockStore } from '../../mock/mock-store';
import { inventoryStore } from '../../mock/mock-inventory-store';
import { cn } from '../../lib/cn';

const RANGES = ['Today', '7 Days', '30 Days', 'All Time'] as const;
type Range = (typeof RANGES)[number];

function filterByRange(isoDate: string, range: Range): boolean {
  const d = new Date(isoDate).getTime();
  const now = Date.now();
  if (range === 'Today') return new Date(isoDate).toDateString() === new Date().toDateString();
  if (range === '7 Days') return d >= now - 7 * 86400000;
  if (range === '30 Days') return d >= now - 30 * 86400000;
  return true; // All Time
}

const SERVICE_LABELS: Record<string, string> = {
  NORMAL: 'Normal',
  EXPRESS: 'Express',
  SAME_DAY: 'Same Day',
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Bank Transfer',
  CARD: 'Card',
};

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary' }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className={cn('text-2xl font-bold font-mono', color)}>{value}</div>
      {sub && <div className="text-xs text-text-muted">{sub}</div>}
    </Card>
  );
}

export function ReportsPage() {
  const [range, setRange] = useState<Range>('7 Days');

  const allOrders = mockStore.getOrders().filter((o) => filterByRange(o.createdAt, range));
  const allTransactions = allOrders.flatMap((o) =>
    o.payments.filter((p) => filterByRange(p.receivedAt, range)).map((p) => ({ ...p, orderId: o.id }))
  );

  // Financial
  const revenue = allTransactions.reduce((a, t) => a + t.amount, 0);
  const outstanding = allOrders.reduce((a, o) => a + o.balanceDue, 0);
  const avgOrderValue = allOrders.length ? Math.round(allOrders.reduce((a, o) => a + o.totalAmount, 0) / allOrders.length) : 0;

  // By payment method
  const byMethod: Record<string, number> = {};
  for (const t of allTransactions) {
    byMethod[t.method] = (byMethod[t.method] || 0) + t.amount;
  }

  // By service tier
  const byTier: Record<string, number> = {};
  for (const o of allOrders) {
    byTier[o.serviceTier] = (byTier[o.serviceTier] || 0) + 1;
  }

  // Stage distribution
  const byStage: Record<string, number> = {};
  for (const o of allOrders) {
    byStage[o.currentStage] = (byStage[o.currentStage] || 0) + 1;
  }

  // Inventory (not date-filtered — stock is current)
  const invItems = inventoryStore.getItems();
  const invValue = invItems.reduce((a, i) => a + i.stockQty * i.unitCost, 0);
  const purchases = inventoryStore.getPurchases();
  const purchaseSpend = purchases.reduce((a, p) => a + p.totalCost, 0);

  // Customers
  const uniqueCustomers = new Set(allOrders.map((o) => o.customerId)).size;

  // Delivery rate
  const delivered = mockStore.getOrders().filter((o) => o.currentStage === 'DELIVERED').length;
  const total = mockStore.getOrders().length;
  const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Business performance overview."
        action={
          <button
            type="button"
            onClick={() => alert('Export — coming in API phase')}
            className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-border/20 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        }
      />

      {/* Range selector */}
      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-xs font-medium transition-colors',
              range === r
                ? 'border-primary bg-primary-light text-primary'
                : 'border-border text-text-muted hover:bg-border/30',
            )}
          >
            {r}
          </button>
        ))}
      </div>

      {/* ── Financial ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Financial
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={TrendingUp} label="Revenue Collected" value={`${revenue.toLocaleString()} RWF`} sub={`${allTransactions.length} transactions`} color="text-emerald-700" />
          <StatCard icon={TrendingUp} label="Outstanding" value={`${outstanding.toLocaleString()} RWF`} sub={`${allOrders.filter(o => o.balanceDue > 0).length} orders unpaid`} color="text-rose-600" />
          <StatCard icon={ShoppingBag} label="Orders" value={allOrders.length} sub={`Avg ${avgOrderValue.toLocaleString()} RWF/order`} />
          <StatCard icon={Users} label="Unique Customers" value={uniqueCustomers} />
        </div>
      </section>

      {/* Payment method breakdown */}
      {Object.keys(byMethod).length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-text">Revenue by Payment Method</h3>
          <div className="space-y-2">
            {Object.entries(byMethod).sort((a, b) => b[1] - a[1]).map(([method, amount]) => {
              const pct = revenue > 0 ? Math.round((amount / revenue) * 100) : 0;
              return (
                <div key={method} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-text">{METHOD_LABELS[method] || method}</span>
                    <span className="font-mono font-medium text-text">{amount.toLocaleString()} RWF <span className="text-text-muted">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-border">
                    <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Operations ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Operations
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* By service tier */}
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-text">Orders by Service Tier</h3>
            {Object.keys(byTier).length === 0 ? (
              <p className="text-xs text-text-muted">No orders in this period.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(byTier).sort((a, b) => b[1] - a[1]).map(([tier, count]) => {
                  const pct = allOrders.length > 0 ? Math.round((count / allOrders.length) * 100) : 0;
                  return (
                    <div key={tier} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-text">{SERVICE_LABELS[tier] || tier}</span>
                        <span className="font-mono font-medium">{count} order{count !== 1 ? 's' : ''} <span className="text-text-muted">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-border">
                        <div
                          className={cn('h-1.5 rounded-full transition-all', tier === 'SAME_DAY' ? 'bg-rose-500' : tier === 'EXPRESS' ? 'bg-amber-500' : 'bg-primary')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Stage distribution */}
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-text">Orders by Current Stage</h3>
            {Object.keys(byStage).length === 0 ? (
              <p className="text-xs text-text-muted">No orders in this period.</p>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(byStage).map(([stage, count]) => (
                  <div key={stage} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-text-muted">{stage.replace('_', ' ')}</span>
                    <span className="font-mono font-semibold text-text tabular-nums">{count}</span>
                  </div>
                ))}
                <div className="pt-1 border-t border-border flex justify-between text-xs font-bold text-text">
                  <span>Delivery rate (all time)</span>
                  <span className="text-primary">{deliveryRate}%</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* ── Inventory ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <Package className="h-4 w-4" /> Inventory
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard icon={Package} label="Stock Value (current)" value={`${invValue.toLocaleString()} RWF`} sub={`${invItems.length} items`} />
          <StatCard icon={ShoppingBag} label="Low / Out of Stock" value={inventoryStore.getLowStockItems().length} sub="items need restocking" color="text-amber-600" />
          <StatCard icon={TrendingUp} label="Total Purchase Spend" value={`${purchaseSpend.toLocaleString()} RWF`} sub={`${purchases.length} purchase records`} />
        </div>
      </section>
    </div>
  );
}
