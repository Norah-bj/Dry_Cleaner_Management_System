import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/orders/StatusBadge';
import { ServiceTierBadge } from '../../components/orders/ServiceTierBadge';
import { mockStore } from '../../mock/mock-store';
import type { Order } from '../../types/order';
import { cn } from '../../lib/cn';

const FILTERS = ['All', 'Processing', 'Ready', 'Delivered', 'Unpaid'] as const;

export function OrdersPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>(() => mockStore.getOrders());

  useEffect(() => {
    return mockStore.subscribe(() => {
      setOrders(mockStore.getOrders());
    });
  }, []);

  const filteredOrders = orders.filter((order) => {
    // Search query filter
    const matchesSearch =
      search === '' ||
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.customerName.toLowerCase().includes(search.toLowerCase()) ||
      order.customerPhone.includes(search);

    if (!matchesSearch) return false;

    // Filter tab query
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
          <Button onClick={() => navigate('/orders/new')}>
            <Plus className="mr-1 h-4 w-4" /> New Order
          </Button>
        }
      />

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
        {filteredOrders.length === 0 ? (
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
