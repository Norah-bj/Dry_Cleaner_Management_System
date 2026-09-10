import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, DollarSign, Printer, Tag } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { OrderSlipModal } from '../../components/orders/OrderSlipModal';
import { OrderTimeline } from '../../components/orders/OrderTimeline';
import { ServiceTierBadge } from '../../components/orders/ServiceTierBadge';
import { StatusBadge } from '../../components/orders/StatusBadge';
import { mockStore } from '../../mock/mock-store';
import type { LaundryStage, Order, PaymentMethod } from '../../types/order';

const STAGES: LaundryStage[] = [
  'RECEIVED',
  'SORTING',
  'WASHING',
  'DRYING',
  'IRONING',
  'QUALITY_CHECK',
  'PACKING',
  'READY',
  'DELIVERED',
];

export function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(() => (id ? mockStore.getOrderById(id) || null : null));
  const [isSlipOpen, setIsSlipOpen] = useState(false);

  // Payment modal state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(() => {
    if (!id) return 0;
    const found = mockStore.getOrderById(id);
    return found ? found.balanceDue : 0;
  });
  const [payMethod, setPayMethod] = useState<PaymentMethod>('MOBILE_MONEY');

  useEffect(() => {
    if (!id) return;
    return mockStore.subscribe(() => {
      const updated = mockStore.getOrderById(id);
      if (updated) {
        setOrder(updated);
        setPayAmount(updated.balanceDue);
      }
    });
  }, [id]);

  if (!order) {
    return (
      <div>
        <PageHeader title="Order Not Found" description="The requested order could not be located." />
        <Button onClick={() => navigate('/orders')}>Back to Orders</Button>
      </div>
    );
  }

  const currentStageIdx = STAGES.indexOf(order.currentStage);
  const nextStage = currentStageIdx < STAGES.length - 1 ? STAGES[currentStageIdx + 1] : null;

  const handleAdvanceStage = () => {
    if (!nextStage) return;
    mockStore.updateOrderStatus(order.id, nextStage, 'Receptionist', `Advanced to ${nextStage}`);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) return;
    mockStore.addPayment(order.id, payAmount, payMethod, 'Receptionist Cashier');
    setIsPaymentOpen(false);
  };

  return (
    <div>
      <div className="mb-2">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="inline-flex items-center text-xs font-medium text-text-muted hover:text-text"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Orders
        </button>
      </div>

      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={`Customer: ${order.customerName} • Phone: ${order.customerPhone}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setIsSlipOpen(true)}>
              <Printer className="mr-1 h-4 w-4" /> Print Slip
            </Button>

            {nextStage && (
              <Button onClick={handleAdvanceStage}>
                Move to {nextStage.replace('_', ' ')} $\rightarrow$
              </Button>
            )}
          </div>
        }
      />

      {/* Header Status Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <StatusBadge stage={order.currentStage} />
          <ServiceTierBadge tier={order.serviceTier} />
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-text-muted">Expected Completion: </span>
            <span className="font-semibold text-text">
              {new Date(order.expectedCompletion).toLocaleString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div>
            <span className="text-text-muted">Payment: </span>
            <span
              className={`font-semibold ${
                order.paymentStatus === 'PAID'
                  ? 'text-emerald-600'
                  : order.paymentStatus === 'PARTIAL'
                  ? 'text-amber-600'
                  : 'text-rose-600'
              }`}
            >
              {order.paymentStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Clean Journey Progress Bar */}
      <Card className="mb-6 p-4">
        <OrderTimeline currentStage={order.currentStage} />
      </Card>

      {/* Main Grid Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Garments & Storage */}
        <div className="lg:col-span-2 space-y-6">
          {/* Garments Card */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3 text-text flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-primary" /> Garments Breakdown
            </h2>

            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-border/20 text-text-muted text-[11px] font-medium uppercase">
                <tr>
                  <th className="py-2 px-3">Garment Item</th>
                  <th className="py-2 px-3 text-center">Qty</th>
                  <th className="py-2 px-3 text-right">Unit Price</th>
                  <th className="py-2 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 px-3 font-medium text-text">{item.garmentName}</td>
                    <td className="py-2.5 px-3 text-center text-text-muted">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{item.unitPrice.toLocaleString()} RWF</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-text">
                      {item.totalPrice.toLocaleString()} RWF
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Storage Identifiers Card */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3 text-text">Storage & Packaging Identifiers</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded border border-amber-200 bg-amber-50 p-2.5">
                <span className="block text-[10px] uppercase text-amber-700 font-semibold">Cover Code</span>
                <span className="text-sm font-bold font-mono text-amber-900">{order.coverCode || 'N/A'}</span>
              </div>
              <div className="rounded border border-amber-200 bg-amber-50 p-2.5">
                <span className="block text-[10px] uppercase text-amber-700 font-semibold">Bag Code</span>
                <span className="text-sm font-bold font-mono text-amber-900">{order.bagCode || 'N/A'}</span>
              </div>
              <div className="rounded border border-border bg-surface p-2.5">
                <span className="block text-[10px] uppercase text-text-muted font-semibold">Hangers</span>
                <span className="text-sm font-bold font-mono text-text">{order.hangersCount}</span>
              </div>
              <div className="rounded border border-border bg-surface p-2.5">
                <span className="block text-[10px] uppercase text-text-muted font-semibold">Envelopes</span>
                <span className="text-sm font-bold font-mono text-text">{order.envelopesCount}</span>
              </div>
            </div>
          </Card>

          {/* Activity Log */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3 text-text flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" /> Order Activity History
            </h2>
            <div className="space-y-3">
              {order.statusHistory.map((hist) => (
                <div key={hist.id} className="flex gap-3 text-xs border-l-2 border-primary pl-3 py-0.5">
                  <div className="flex-1">
                    <div className="font-semibold text-text">
                      {hist.stage.replace('_', ' ')}
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Updated by {hist.changedBy} • {new Date(hist.changedAt).toLocaleString()}
                    </div>
                    {hist.notes && <div className="mt-0.5 text-text-muted italic">{hist.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Financial Summary */}
        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3 text-text flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-primary" /> Payment Summary
            </h2>

            <div className="space-y-2 text-xs border-b border-border pb-3">
              <div className="flex justify-between text-text-muted">
                <span>Garments Subtotal:</span>
                <span className="font-mono text-text">{order.subtotal.toLocaleString()} RWF</span>
              </div>

              {order.priorityFee > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Priority Charge:</span>
                  <span className="font-mono">+{order.priorityFee.toLocaleString()} RWF</span>
                </div>
              )}

              {order.materialCharges > 0 && (
                <div className="flex justify-between text-text-muted">
                  <span>Material Charges:</span>
                  <span className="font-mono text-text">+{order.materialCharges.toLocaleString()} RWF</span>
                </div>
              )}

              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-mono">-{order.discount.toLocaleString()} RWF</span>
                </div>
              )}
            </div>

            <div className="my-3 space-y-1 text-xs">
              <div className="flex justify-between font-bold text-sm text-text">
                <span>TOTAL:</span>
                <span className="font-mono text-primary">{order.totalAmount.toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Paid Amount:</span>
                <span className="font-mono">{order.amountPaid.toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between text-rose-700 font-bold">
                <span>Balance Due:</span>
                <span className="font-mono">{order.balanceDue.toLocaleString()} RWF</span>
              </div>
            </div>

            {order.balanceDue > 0 && (
              <Button onClick={() => setIsPaymentOpen(true)} className="w-full mt-3">
                <DollarSign className="h-4 w-4 mr-1" /> Record Payment
              </Button>
            )}
          </Card>

          {/* Recorded Payments List */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3 text-text">Payment Transactions</h2>
            {order.payments.length === 0 ? (
              <p className="text-xs text-text-muted italic">No payment transactions recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {order.payments.map((p) => (
                  <div key={p.id} className="rounded border border-border p-2 text-xs flex justify-between">
                    <div>
                      <span className="font-semibold text-text">{p.receiptNumber}</span>
                      <span className="block text-[10px] text-text-muted">
                        {p.method} • {new Date(p.receivedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-emerald-700">
                      +{p.amount.toLocaleString()} RWF
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Order Slip Modal */}
      <OrderSlipModal order={order} isOpen={isSlipOpen} onClose={() => setIsSlipOpen(false)} />

      {/* Record Payment Modal */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-surface p-5 shadow-lg border border-border">
            <h3 className="text-sm font-semibold text-text mb-3">Record Payment for {order.orderNumber}</h3>
            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-text-muted mb-1">Amount (RWF)</label>
                <input
                  type="number"
                  min="1"
                  max={order.balanceDue}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                  className="w-full rounded border border-border px-3 py-1.5 font-mono text-text focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-text-muted mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded border border-border px-3 py-1.5 text-text focus:border-primary focus:outline-none"
                >
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" type="button" onClick={() => setIsPaymentOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit Payment</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
