import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, Search, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError } from '../../components/ui/LoadError';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/orders/StatusBadge';
import { ServiceTierBadge } from '../../components/orders/ServiceTierBadge';
import { errorMessage } from '../../lib/error-message';
import { listOrders, type ApiOrder } from '../../services/orders';
import type { LaundryStage, Order, PaymentStatus, ServiceTier } from '../../types/order';
import { cn } from '../../lib/cn';

const FILTERS = ['All', 'Processing', 'Ready', 'Delivered', 'Unpaid'] as const;

function mapApiOrderToOrder(api: ApiOrder): Order {
  const currentStage = (api.status === 'CANCELLED' ? 'RECEIVED' : api.status) as LaundryStage;
  const serviceTier = (api.serviceTier === 'STANDARD' ? 'NORMAL' : api.serviceTier) as ServiceTier;
  const paymentStatus: PaymentStatus =
    api.paymentStatus === 'PAID'
      ? 'PAID'
      : api.paymentStatus === 'PARTIALLY_PAID'
        ? 'PARTIAL'
        : 'UNPAID';

  return {
    id: api.id,
    orderNumber: api.orderNumber,
    customerId: api.customerId,
    customerName: api.customer?.name ?? 'Customer',
    customerPhone: api.customer?.phone ?? '',
    customerAddress: api.customer?.address,
    serviceTier,
    currentStage,
    expectedCompletion: api.expectedCompletion ?? null,
    coverCode: api.storageHangerId,
    bagCode: api.storageBoxId,
    hangersCount: api.materials.filter((m) => m.materialType === 'HANGER').reduce((s, m) => s + m.quantity, 0),
    envelopesCount: api.materials.filter((m) => m.materialType === 'ENVELOPE').reduce((s, m) => s + m.quantity, 0),
    items: api.items.map((it, idx) => ({
      id: it.id ?? `item-${idx}`,
      garmentName: it.garmentName,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      totalPrice: Number(it.lineTotal ?? it.quantity * it.unitPrice),
      notes: it.notes,
    })),
    materials: api.materials.map((m, idx) => ({
      id: m.id ?? `mat-${idx}`,
      name: m.materialType,
      quantity: m.quantity,
      unitPrice: Number(m.unitCharge),
      totalPrice: Number(m.totalCharge ?? m.quantity * m.unitCharge),
      customerProvided: m.customerProvided ?? false,
    })),
    subtotal: Number(api.subtotal),
    materialCharges: Number(api.materialCharges),
    priorityFee: 0,
    discount: Number(api.discount),
    totalAmount: Number(api.total),
    amountPaid: Number(api.amountPaid),
    balanceDue: Number(api.balance),
    paymentStatus,
    statusHistory: (api.statusHistory ?? []).map((sh) => ({
      id: sh.id,
      stage: (sh.newStatus === 'CANCELLED' ? 'RECEIVED' : sh.newStatus) as LaundryStage,
      changedBy: sh.changedByUserId ?? 'Staff',
      changedAt: sh.createdAt,
      notes: sh.notes,
    })),
    payments: (api.payments ?? []).map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      amount: Number(p.amount),
      method: p.paymentMethod === 'MOMO' ? 'MOBILE_MONEY' : p.paymentMethod,
      receivedBy: p.receivedByUserId ?? 'Cashier',
      receivedAt: p.createdAt,
      reference: p.referenceNumber,
    })),
    notes: api.notes,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

export function OrdersPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listOrders({ search: search || undefined });
      setOrders(res.data.map(mapApiOrderToOrder));
    } catch (err) {
      setError(errorMessage(err, 'load orders'));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      search === '' ||
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.customerName.toLowerCase().includes(search.toLowerCase()) ||
      order.customerPhone.includes(search);

    if (!matchesSearch) return false;

    if (filter === 'Processing') {
      return !['READY', 'DELIVERED'].includes(order.currentStage);
    }
    if (filter === 'Ready') {
      return order.currentStage === 'READY';
    }
    if (filter === 'Delivered') {
      return order.currentStage === 'DELIVERED';
    }
    if (filter === 'Unpaid') {
      return order.paymentStatus === 'UNPAID' || order.paymentStatus === 'PARTIAL';
    }

    return true;
  });

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Manage customer orders from intake through processing to pickup and delivery."
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => fetchOrders()} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <Button onClick={() => navigate('/orders/new')}>
              <Plus className="mr-1 h-4 w-4" /> New Order
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4">
          <LoadError message={error} onRetry={() => void fetchOrders()} />
        </div>
      )}

      {/* Quick Filter Tabs & Search Bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1 text-xs font-medium transition-colors',
                filter === f
                  ? 'border-primary bg-primary-light text-primary font-semibold'
                  : 'border-border text-text-muted hover:bg-border/30 hover:text-text',
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer, phone..."
            className="w-full rounded-md border border-border bg-surface pl-8 pr-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Orders Table Card */}
      <Card className="p-0 overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-muted">
            <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-primary" />
            Loading orders...
          </div>
        ) : error && orders.length === 0 ? (
          <div className="p-6 text-center text-xs text-text-muted">
            Orders will appear here once the server can be reached.
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={ClipboardList}
              title={`No ${filter === 'All' ? '' : filter.toLowerCase() + ' '}orders found`}
              description="Create a new order at intake or change your search filter."
              action={
                <Button variant="secondary" onClick={() => navigate('/orders/new')}>
                  Create Order Intake
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-border/20 text-text-muted font-medium uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="hover:bg-border/10 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-primary">
                      {order.orderNumber}
                      {order.coverCode && (
                        <span className="block text-[10px] font-mono text-text-muted font-normal">
                          {order.coverCode}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-text">{order.customerName}</div>
                      <div className="text-[11px] text-text-muted">{order.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                    </td>
                    <td className="px-4 py-3">
                      <ServiceTierBadge tier={order.serviceTier} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge stage={order.currentStage} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-block rounded px-2 py-0.5 text-[11px] font-semibold',
                          order.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.paymentStatus === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800',
                        )}
                      >
                        {order.paymentStatus === 'PAID'
                          ? 'Paid'
                          : order.paymentStatus === 'PARTIAL'
                          ? `Paid ${order.amountPaid.toLocaleString()} RWF`
                          : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {order.totalAmount.toLocaleString()} RWF
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/orders/${order.id}`);
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
