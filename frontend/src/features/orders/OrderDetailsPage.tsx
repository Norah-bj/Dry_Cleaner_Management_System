import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, DollarSign, Printer, Tag, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { OrderSlipModal } from '../../components/orders/OrderSlipModal';
import { OrderTimeline } from '../../components/orders/OrderTimeline';
import { ServiceTierBadge } from '../../components/orders/ServiceTierBadge';
import { StatusBadge } from '../../components/orders/StatusBadge';
import { mockStore } from '../../mock/mock-store';
import { getOrder, updateOrderStatus, type ApiOrder } from '../../services/orders';
import { recordOrderPayment } from '../../services/payments';
import type { LaundryStage, Order, PaymentMethod, ServiceTier, PaymentStatus } from '../../types/order';

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
    expectedCompletion: api.expectedCompletion ?? new Date().toISOString(),
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

export function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(() => (id ? mockStore.getOrderById(id) || null : null));
  const [loading, setLoading] = useState(false);
  const [isSlipOpen, setIsSlipOpen] = useState(false);

  // Payment modal state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('MOBILE_MONEY');

  const fetchOrderDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getOrder(id);
      if (res) {
        const mapped = mapApiOrderToOrder(res);
        setOrder(mapped);
        setPayAmount(mapped.balanceDue);
      }
    } catch {
      const found = mockStore.getOrderById(id);
      if (found) {
        setOrder(found);
        setPayAmount(found.balanceDue);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

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

  const handleAdvanceStage = async () => {
    if (!nextStage || !id) return;
    try {
      await updateOrderStatus(id, { status: nextStage, notes: `Advanced to ${nextStage}` });
      await fetchOrderDetail();
    } catch {
      mockStore.updateOrderStatus(order.id, nextStage, 'Receptionist', `Advanced to ${nextStage}`);
      const updated = mockStore.getOrderById(order.id);
      if (updated) setOrder(updated);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0 || !id) return;

    try {
      await recordOrderPayment(id, {
        amount: payAmount,
        paymentMethod: payMethod === 'MOBILE_MONEY' ? 'MOMO' : payMethod,
        notes: 'Payment recorded via Order Details',
      });
      await fetchOrderDetail();
    } catch {
      mockStore.addPayment(order.id, payAmount, payMethod, 'Receptionist Cashier');
      const updated = mockStore.getOrderById(order.id);
      if (updated) setOrder(updated);
    }

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
            <Button variant="secondary" size="sm" onClick={() => fetchOrderDetail()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Timeline, Garments, Materials */}
        <div className="space-y-6 lg:col-span-2">
          {/* Progress Timeline */}
          <Card className="p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4">
              The Clean Journey Progress
            </h2>
            <OrderTimeline currentStage={order.currentStage} />
          </Card>

          {/* Garments List */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-text mb-3">Garments in Order</h2>
            <div className="overflow-x-auto rounded border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-border/20 text-text-muted uppercase text-[10px] font-medium">
                  <tr>
                    <th className="px-3 py-2">Garment</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                    <th className="px-3 py-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="bg-surface">
                      <td className="px-3 py-2 font-medium text-text">{item.garmentName}</td>
                      <td className="px-3 py-2 text-center font-bold">{item.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono text-text-muted">
                        {item.unitPrice.toLocaleString()} RWF
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-text">
                        {item.totalPrice.toLocaleString()} RWF
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Materials Used */}
          {order.materials.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-bold text-text mb-3">Packaging & Materials</h2>
              <div className="space-y-2">
                {order.materials.map((mat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded border border-border bg-border/10 p-2.5 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-text">{mat.name}</span>
                      <span className="ml-2 text-[11px] text-text-muted">
                        Qty: {mat.quantity} {mat.customerProvided && '(Customer Provided)'}
                      </span>
                    </div>
                    <div className="font-mono font-bold text-text">
                      {mat.customerProvided ? 'FREE' : `${mat.totalPrice.toLocaleString()} RWF`}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Status Activity Log */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-text mb-3">Activity & Handover Log</h2>
            <div className="space-y-3">
              {order.statusHistory.map((sh, idx) => (
                <div key={idx} className="flex items-start justify-between border-b border-border/60 pb-2 text-xs">
                  <div>
                    <div className="font-semibold text-text">
                      Stage changed to <StatusBadge stage={sh.stage} />
                    </div>
                    {sh.notes && <div className="text-[11px] text-text-muted mt-0.5">{sh.notes}</div>}
                  </div>
                  <div className="text-right text-[11px] text-text-muted">
                    <div>{sh.changedBy}</div>
                    <div>{new Date(sh.changedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Col: Storage Tags, Payment State, Customer Summary */}
        <div className="space-y-6">
          {/* Storage Identifiers Card */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-text mb-3 flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-primary" /> Storage Identifiers
            </h2>
            <div className="space-y-3">
              <div className="rounded-lg border border-primary/30 bg-primary-light/30 p-3 text-center">
                <span className="block text-[10px] uppercase font-bold text-primary">
                  Hanger Garment Slot
                </span>
                <span className="font-mono text-lg font-extrabold text-primary">
                  {order.coverCode || 'H-UNASSIGNED'}
                </span>
              </div>

              <div className="rounded-lg border border-border bg-surface p-3 text-center">
                <span className="block text-[10px] uppercase font-bold text-text-muted">
                  Storage Bag / Box ID
                </span>
                <span className="font-mono text-base font-bold text-text">
                  {order.bagCode || 'B-UNASSIGNED'}
                </span>
              </div>
            </div>
          </Card>

          {/* Payment Status Card */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-text flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-emerald-600" /> Payment Status
              </h2>
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800'
                    : order.paymentStatus === 'PARTIAL'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>

            <div className="space-y-2 text-xs border-b border-border pb-3">
              <div className="flex justify-between text-text-muted">
                <span>Total Amount:</span>
                <span className="font-mono text-text font-bold">
                  {order.totalAmount.toLocaleString()} RWF
                </span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Amount Paid:</span>
                <span className="font-mono text-emerald-600 font-bold">
                  {order.amountPaid.toLocaleString()} RWF
                </span>
              </div>
              <div className="flex justify-between text-text font-semibold pt-1">
                <span>Balance Due:</span>
                <span className="font-mono text-rose-600 font-bold">
                  {order.balanceDue.toLocaleString()} RWF
                </span>
              </div>
            </div>

            {order.balanceDue > 0 && (
              <Button className="mt-3 w-full" onClick={() => setIsPaymentOpen(true)}>
                Record Payment ({order.balanceDue.toLocaleString()} RWF)
              </Button>
            )}

            {/* Payment history list */}
            {order.payments.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <span className="block text-[10px] uppercase font-bold text-text-muted mb-2">
                  Receipt Ledger
                </span>
                <div className="space-y-2">
                  {order.payments.map((p, idx) => (
                    <div key={idx} className="rounded border border-border bg-surface p-2 text-xs">
                      <div className="flex justify-between font-mono font-bold text-text">
                        <span>{p.receiptNumber}</span>
                        <span>{p.amount.toLocaleString()} RWF</span>
                      </div>
                      <div className="text-[10px] text-text-muted flex justify-between mt-1">
                        <span>{p.method}</span>
                        <span>{new Date(p.receivedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Delivery & Timings */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-text mb-3 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" /> Delivery & Timings
            </h2>
            <div className="space-y-2 text-xs">
              <div>
                <span className="block text-[10px] uppercase text-text-muted font-bold">
                  Priority Service
                </span>
                <ServiceTierBadge tier={order.serviceTier} />
              </div>

              <div className="pt-2">
                <span className="block text-[10px] uppercase text-text-muted font-bold">
                  Expected Ready Date
                </span>
                <span className="font-semibold text-text">
                  {new Date(order.expectedCompletion).toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Slip Modal */}
      <OrderSlipModal isOpen={isSlipOpen} onClose={() => setIsSlipOpen(false)} order={order} />

      {/* Record Payment Dialog */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-text">Record Payment for {order.orderNumber}</h2>
            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-text mb-1">Amount to Pay (RWF)</label>
                <input
                  type="number"
                  min="1"
                  max={order.balanceDue}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full rounded border border-border bg-surface px-3 py-1.5 font-mono text-text focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded border border-border bg-surface px-3 py-1.5 text-text focus:border-primary focus:outline-none"
                >
                  <option value="MOBILE_MONEY">Mobile Money (MoMo)</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card POS</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsPaymentOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Confirm Payment</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
