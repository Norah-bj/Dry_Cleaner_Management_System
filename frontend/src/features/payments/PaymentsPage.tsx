import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, CreditCard, DollarSign, Plus, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { mockStore } from '../../mock/mock-store';
import { cn } from '../../lib/cn';

const TABS = ['Overview', 'Transactions', 'Outstanding'] as const;
const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Bank Transfer',
  CARD: 'Card',
};
const METHOD_COLORS: Record<string, string> = {
  CASH: 'bg-emerald-100 text-emerald-800',
  MOBILE_MONEY: 'bg-blue-100 text-blue-800',
  BANK_TRANSFER: 'bg-purple-100 text-purple-800',
  CARD: 'bg-amber-100 text-amber-800',
};

export function PaymentsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState(() => mockStore.getOrders());

  useEffect(() => {
    return mockStore.subscribe(() => {
      setOrders(mockStore.getOrders());
    });
  }, []);

  // Derive all payments across all orders from mock store
  const allOrders = orders;

  // Flatten every payment transaction
  const allTransactions = allOrders
    .flatMap((o) =>
      o.payments.map((p) => ({
        ...p,
        orderNumber: o.orderNumber,
        customerId: o.customerId,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
      })),
    )
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

  // Today's transactions
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTxns = allTransactions.filter((t) => t.receivedAt.startsWith(todayStr));

  // Method breakdown for today
  const todayByMethod: Record<string, number> = {};
  for (const t of todayTxns) {
    todayByMethod[t.method] = (todayByMethod[t.method] || 0) + t.amount;
  }
  const todayTotal = Object.values(todayByMethod).reduce((a, b) => a + b, 0);

  // All-time totals
  const totalCollected = allTransactions.reduce((a, t) => a + t.amount, 0);

  // Outstanding orders (balance > 0)
  const outstandingOrders = allOrders
    .filter((o) => o.balanceDue > 0)
    .sort((a, b) => b.balanceDue - a.balanceDue);
  const totalOutstanding = outstandingOrders.reduce((a, o) => a + o.balanceDue, 0);

  // Search filter for transactions tab
  const filteredTxns = allTransactions.filter((t) => {
    if (!search) return true;
    return (
      t.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.orderNumber.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track collections, outstanding balances, and payment history."
        action={
          <Button onClick={() => navigate('/orders')} variant="secondary">
            <Plus className="mr-1 h-4 w-4" /> Record Payment via Order
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Today's Collection</div>
          <div className="text-xl font-bold text-primary font-mono">
            {todayTotal.toLocaleString()} <span className="text-sm font-medium">RWF</span>
          </div>
          <div className="text-xs text-text-muted mt-1">{todayTxns.length} transactions</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Total Collected</div>
          <div className="text-xl font-bold text-text font-mono">
            {totalCollected.toLocaleString()} <span className="text-sm font-medium">RWF</span>
          </div>
          <div className="text-xs text-text-muted mt-1">{allTransactions.length} transactions</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Outstanding</div>
          <div className="text-xl font-bold text-rose-600 font-mono">
            {totalOutstanding.toLocaleString()} <span className="text-sm font-medium">RWF</span>
          </div>
          <div className="text-xs text-text-muted mt-1">{outstandingOrders.length} orders unpaid</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Cash Today</div>
          <div className="text-xl font-bold text-emerald-700 font-mono">
            {(todayByMethod['CASH'] || 0).toLocaleString()} <span className="text-sm font-medium">RWF</span>
          </div>
          <div className="text-xs text-text-muted mt-1">
            MoMo: {(todayByMethod['MOBILE_MONEY'] || 0).toLocaleString()} RWF
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {t}
            {t === 'Outstanding' && outstandingOrders.length > 0 && (
              <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                {outstandingOrders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'Overview' && (
        <div className="space-y-4">
          {/* Payment method breakdown */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-text mb-3">Today's Collection by Method</h2>
            {todayTxns.length === 0 ? (
              <EmptyState
                icon={DollarSign}
                title="No payments recorded today"
                description="Payments recorded on orders will appear here."
              />
            ) : (
              <div className="space-y-2">
                {Object.entries(todayByMethod).map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between">
                    <span className={cn('rounded px-2 py-0.5 text-xs font-medium', METHOD_COLORS[method] || 'bg-slate-100 text-slate-700')}>
                      {METHOD_LABELS[method] || method}
                    </span>
                    <span className="font-mono font-semibold text-sm text-text">
                      {amount.toLocaleString()} RWF
                    </span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-bold text-sm text-text">
                  <span>Total</span>
                  <span className="font-mono text-primary">{todayTotal.toLocaleString()} RWF</span>
                </div>
              </div>
            )}
          </Card>

          {/* Recent transactions preview */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-text mb-3">Recent Transactions</h2>
            {allTransactions.length === 0 ? (
              <EmptyState icon={CreditCard} title="No transactions yet" description="Record payments on orders to see them here." />
            ) : (
              <div className="space-y-2">
                {allTransactions.slice(0, 6).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded border border-border p-2.5 text-xs hover:bg-border/10 cursor-pointer"
                    onClick={() => navigate(`/orders/${t.orderNumber}`)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">{t.receiptNumber}</span>
                        <span className="text-text-muted">→ {t.orderNumber}</span>
                      </div>
                      <div className="text-text-muted mt-0.5">
                        {t.customerName} • {new Date(t.receivedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-700">
                        +{t.amount.toLocaleString()} RWF
                      </div>
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', METHOD_COLORS[t.method] || 'bg-slate-100 text-slate-700')}>
                        {METHOD_LABELS[t.method] || t.method}
                      </span>
                    </div>
                  </div>
                ))}
                {allTransactions.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setTab('Transactions')}
                    className="w-full text-center text-xs text-primary hover:underline pt-1"
                  >
                    View all {allTransactions.length} transactions →
                  </button>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Transactions Tab */}
      {tab === 'Transactions' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search receipt #, customer, order..."
              className="w-full max-w-sm rounded border border-border bg-surface pl-8 pr-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
            />
          </div>

          <Card className="p-0 overflow-hidden">
            {filteredTxns.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={CreditCard} title="No transactions found" description="Try adjusting your search." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-border/20 text-text-muted font-medium uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Receipt #</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Received By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTxns.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-border/10 cursor-pointer"
                        onClick={() => navigate(`/orders/${t.orderNumber}`)}
                      >
                        <td className="px-4 py-2.5 font-semibold text-primary">{t.receiptNumber}</td>
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-text">{t.customerName}</div>
                          <div className="text-[11px] text-text-muted">{t.customerPhone}</div>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-text-muted">{t.orderNumber}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('rounded px-2 py-0.5 text-[11px] font-medium', METHOD_COLORS[t.method] || 'bg-slate-100 text-slate-700')}>
                            {METHOD_LABELS[t.method] || t.method}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-700">
                          +{t.amount.toLocaleString()} RWF
                        </td>
                        <td className="px-4 py-2.5 text-text-muted">
                          {new Date(t.receivedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-text-muted">{t.receivedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Outstanding Tab */}
      {tab === 'Outstanding' && (
        <div className="space-y-4">
          {outstandingOrders.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={CheckCircle}
                title="All orders are fully paid"
                description="No outstanding balances — great collection work!"
              />
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm">
                <div className="flex items-center gap-2 text-rose-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-semibold">{outstandingOrders.length} orders with unpaid balance</span>
                </div>
                <span className="font-mono font-bold text-rose-700">
                  {totalOutstanding.toLocaleString()} RWF total
                </span>
              </div>

              <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-border/20 text-text-muted font-medium uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Stage</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">Paid</th>
                        <th className="px-4 py-3 text-right">Balance Due</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {outstandingOrders.map((o) => (
                        <tr
                          key={o.id}
                          className="hover:bg-border/10 cursor-pointer"
                          onClick={() => navigate(`/orders/${o.id}`)}
                        >
                          <td className="px-4 py-2.5 font-semibold text-primary">{o.orderNumber}</td>
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-text">{o.customerName}</div>
                            <div className="text-[11px] text-text-muted">{o.customerPhone}</div>
                          </td>
                          <td className="px-4 py-2.5 text-text-muted capitalize">
                            {o.currentStage.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono">{o.totalAmount.toLocaleString()} RWF</td>
                          <td className="px-4 py-2.5 text-right font-mono text-emerald-700">
                            {o.amountPaid.toLocaleString()} RWF
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-700">
                            {o.balanceDue.toLocaleString()} RWF
                          </td>
                          <td className="px-4 py-2.5">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/orders/${o.id}`);
                              }}
                            >
                              Pay Now
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
