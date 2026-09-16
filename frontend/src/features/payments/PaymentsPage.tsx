import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Plus, Search, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { mockStore } from '../../mock/mock-store';
import { getPaymentsSummary, listPayments } from '../../services/payments';
import { listOrders } from '../../services/orders';
import { cn } from '../../lib/cn';

const TABS = ['Overview', 'Transactions', 'Outstanding'] as const;
const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  MOMO: 'Mobile Money',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Bank Transfer',
  CARD: 'Card POS',
};
const METHOD_COLORS: Record<string, string> = {
  CASH: 'bg-emerald-100 text-emerald-800',
  MOMO: 'bg-blue-100 text-blue-800',
  MOBILE_MONEY: 'bg-blue-100 text-blue-800',
  BANK_TRANSFER: 'bg-purple-100 text-purple-800',
  CARD: 'bg-amber-100 text-amber-800',
};

export function PaymentsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Live state from API or mock fallback
  const [summary, setSummary] = useState({
    todayTotal: 0,
    methodBreakdown: { CASH: 0, MOMO: 0, BANK_TRANSFER: 0, CARD: 0 },
    totalOutstanding: 0,
  });

  const [transactions, setTransactions] = useState<
    Array<{
      id: string;
      receiptNumber: string;
      amount: number;
      method: string;
      orderNumber?: string;
      orderId?: string;
      customerName?: string;
      receivedBy: string;
      receivedAt: string;
    }>
  >([]);

  const [outstandingOrders, setOutstandingOrders] = useState<
    Array<{
      id: string;
      orderNumber: string;
      customerName: string;
      customerPhone: string;
      total: number;
      amountPaid: number;
      balance: number;
      createdAt: string;
    }>
  >([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, txRes, ordersRes] = await Promise.all([
        getPaymentsSummary(),
        listPayments({ search: search || undefined }),
        listOrders({ paymentStatus: 'UNPAID' }),
      ]);

      if (sumRes) {
        setSummary({
          todayTotal: sumRes.todayTotal,
          methodBreakdown: sumRes.methodBreakdown,
          totalOutstanding: sumRes.totalOutstanding,
        });
      }

      if (txRes && txRes.data) {
        setTransactions(
          txRes.data.map((t) => ({
            id: t.id,
            receiptNumber: t.receiptNumber,
            amount: Number(t.amount),
            method: t.paymentMethod,
            orderId: (t as any).orderId,
            orderNumber: (t as any).order?.orderNumber,
            customerName: (t as any).order?.customer?.name,
            receivedBy: t.receivedByUserId ?? 'Cashier Staff',
            receivedAt: t.createdAt,
          })),
        );
      }

      if (ordersRes && ordersRes.data) {
        setOutstandingOrders(
          ordersRes.data
            .filter((o) => Number(o.balance) > 0)
            .map((o) => ({
              id: o.id,
              orderNumber: o.orderNumber,
              customerName: o.customer?.name ?? 'Customer',
              customerPhone: o.customer?.phone ?? '',
              total: Number(o.total),
              amountPaid: Number(o.amountPaid),
              balance: Number(o.balance),
              createdAt: o.createdAt,
            })),
        );
      }
    } catch {
      // Mock store fallback
      const allOrders = mockStore.getOrders();
      const allTx = allOrders
        .flatMap((o) =>
          o.payments.map((p) => ({
            id: p.id,
            receiptNumber: p.receiptNumber,
            amount: p.amount,
            method: p.method,
            orderId: o.id,
            orderNumber: o.orderNumber,
            customerName: o.customerName,
            receivedBy: p.receivedBy,
            receivedAt: p.receivedAt,
          })),
        )
        .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

      setTransactions(allTx);

      const todayStr = new Date().toISOString().split('T')[0];
      const todayTxns = allTx.filter((t) => t.receivedAt.startsWith(todayStr));
      const todayTotal = todayTxns.reduce((a, b) => a + b.amount, 0);

      const outOrders = allOrders
        .filter((o) => o.balanceDue > 0)
        .map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          total: o.totalAmount,
          amountPaid: o.amountPaid,
          balance: o.balanceDue,
          createdAt: o.createdAt,
        }));

      setOutstandingOrders(outOrders);
      setSummary({
        todayTotal,
        methodBreakdown: { CASH: todayTotal, MOMO: 0, BANK_TRANSFER: 0, CARD: 0 },
        totalOutstanding: outOrders.reduce((a, b) => a + b.balance, 0),
      });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTxns = transactions.filter((t) => {
    if (!search) return true;
    return (
      t.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
      (t.customerName && t.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (t.orderNumber && t.orderNumber.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track collections, outstanding balances, and payment history."
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => fetchData()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => navigate('/orders')} variant="secondary">
              <Plus className="mr-1 h-4 w-4" /> Record Payment via Order
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Today's Collection</div>
          <div className="text-xl font-bold text-primary font-mono">
            {summary.todayTotal.toLocaleString()} <span className="text-sm font-medium">RWF</span>
          </div>
          <div className="text-[11px] text-text-muted mt-1">Cash + MoMo + POS</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Total Outstanding</div>
          <div className="text-xl font-bold text-rose-600 font-mono">
            {summary.totalOutstanding.toLocaleString()} <span className="text-sm font-medium">RWF</span>
          </div>
          <div className="text-[11px] text-rose-500 mt-1">
            {outstandingOrders.length} unpaid / partial orders
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">MoMo Collection Today</div>
          <div className="text-xl font-bold text-blue-600 font-mono">
            {(summary.methodBreakdown.MOMO || 0).toLocaleString()}{' '}
            <span className="text-sm font-medium">RWF</span>
          </div>
          <div className="text-[11px] text-text-muted mt-1">MTN / Airtel Mobile Money</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Cash Collection Today</div>
          <div className="text-xl font-bold text-emerald-600 font-mono">
            {(summary.methodBreakdown.CASH || 0).toLocaleString()}{' '}
            <span className="text-sm font-medium">RWF</span>
          </div>
          <div className="text-[11px] text-text-muted mt-1">Drawer Cash In Hand</div>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px',
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {t}
            {t === 'Outstanding' && outstandingOrders.length > 0 && (
              <span className="ml-1.5 rounded-full bg-rose-100 text-rose-800 px-1.5 py-0.2 text-[10px] font-bold">
                {outstandingOrders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-5 space-y-4">
            <h2 className="text-sm font-bold text-text">Today's Method Breakdown</h2>
            <div className="space-y-3">
              {['CASH', 'MOMO', 'BANK_TRANSFER', 'CARD'].map((m) => {
                const amount = (summary.methodBreakdown as any)[m] || 0;
                const pct = summary.todayTotal > 0 ? Math.round((amount / summary.todayTotal) * 100) : 0;
                return (
                  <div key={m} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-text">{METHOD_LABELS[m] || m}</span>
                      <span className="font-mono text-text">
                        {amount.toLocaleString()} RWF ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-border overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-text">Recent Transactions</h2>
              <Button variant="ghost" size="sm" onClick={() => setTab('Transactions')}>
                View All $\rightarrow$
              </Button>
            </div>
            <div className="space-y-2">
              {transactions.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded border border-border bg-surface p-2.5 text-xs hover:border-primary cursor-pointer transition-colors"
                  onClick={() => t.orderId && navigate(`/orders/${t.orderId}`)}
                >
                  <div>
                    <div className="font-mono font-bold text-primary">{t.receiptNumber}</div>
                    <div className="text-[11px] text-text-muted">
                      {t.customerName || t.orderNumber} • {METHOD_LABELS[t.method] || t.method}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-600">
                      +{t.amount.toLocaleString()} RWF
                    </div>
                    <div className="text-[10px] text-text-muted">
                      {new Date(t.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Transactions Table */}
      {tab === 'Transactions' && (
        <Card className="p-0 overflow-hidden space-y-3">
          <div className="p-4 border-b border-border">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search receipt #, customer, order..."
                className="w-full rounded-md border border-border bg-surface pl-8 pr-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-border/20 text-text-muted font-medium uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Receipt #</th>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Received By</th>
                  <th className="px-4 py-3 text-right">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filteredTxns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-text-muted">
                      No payment transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredTxns.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => t.orderId && navigate(`/orders/${t.orderId}`)}
                      className="hover:bg-border/10 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-primary">{t.receiptNumber}</td>
                      <td className="px-4 py-3 font-mono">{t.orderNumber || '—'}</td>
                      <td className="px-4 py-3 font-medium text-text">{t.customerName || 'Walk-in Customer'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${METHOD_COLORS[t.method] || 'bg-gray-100 text-gray-800'}`}>
                          {METHOD_LABELS[t.method] || t.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                        {t.amount.toLocaleString()} RWF
                      </td>
                      <td className="px-4 py-3 text-text-muted">{t.receivedBy}</td>
                      <td className="px-4 py-3 text-right text-text-muted font-mono text-[11px]">
                        {new Date(t.receivedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Outstanding Orders */}
      {tab === 'Outstanding' && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-border bg-rose-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-800 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 text-rose-600" /> Total Uncollected Balance:{' '}
              <span className="font-mono font-bold text-sm">{summary.totalOutstanding.toLocaleString()} RWF</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-border/20 text-text-muted font-medium uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">Order Total</th>
                  <th className="px-4 py-3 text-right">Paid So Far</th>
                  <th className="px-4 py-3 text-right">Balance Owed</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {outstandingOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-text-muted">
                      All orders are fully settled! Zero outstanding receivables.
                    </td>
                  </tr>
                ) : (
                  outstandingOrders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => navigate(`/orders/${o.id}`)}
                      className="hover:bg-border/10 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-primary">{o.orderNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">{o.customerName}</div>
                        <div className="text-[11px] text-text-muted">{o.customerPhone}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{o.total.toLocaleString()} RWF</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600">
                        {o.amountPaid.toLocaleString()} RWF
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
                        {o.balance.toLocaleString()} RWF
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="secondary"
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
