import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Tag, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { ServiceTierBadge } from '../../components/orders/ServiceTierBadge';
import { LoadError } from '../../components/ui/LoadError';
import { errorMessage } from '../../lib/error-message';
import { getLaundryBoard } from '../../services/laundry';
import { updateOrderStatus, type ApiOrder } from '../../services/orders';
import type { LaundryStage, Order, ServiceTier } from '../../types/order';

const STAGES: Array<{ key: LaundryStage; label: string; description: string }> = [
  { key: 'RECEIVED', label: 'Received', description: 'Intake at reception' },
  { key: 'SORTING', label: 'Sorting', description: 'Color & fabric separation' },
  { key: 'WASHING', label: 'Washing', description: 'In washing machines' },
  { key: 'DRYING', label: 'Drying', description: 'Tumble drying & air dry' },
  { key: 'IRONING', label: 'Ironing', description: 'Steam ironing & pressing' },
  { key: 'QUALITY_CHECK', label: 'QC Check', description: 'Stain & inspection check' },
  { key: 'PACKING', label: 'Packing', description: 'Hangers & plastic cover' },
  { key: 'READY', label: 'Ready', description: 'Awaiting pickup/delivery' },
];

function mapApiOrderToOrder(api: ApiOrder): Order {
  const currentStage = (api.status === 'CANCELLED' ? 'RECEIVED' : api.status) as LaundryStage;
  const serviceTier = (api.serviceTier === 'STANDARD' ? 'NORMAL' : api.serviceTier) as ServiceTier;

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
    hangersCount: 0,
    envelopesCount: 0,
    items: (api.items ?? []).map((it, idx) => ({
      id: it.id ?? `item-${idx}`,
      garmentName: it.garmentName,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      totalPrice: Number(it.lineTotal ?? it.quantity * it.unitPrice),
    })),
    materials: [],
    subtotal: Number(api.subtotal),
    materialCharges: Number(api.materialCharges),
    priorityFee: 0,
    discount: Number(api.discount),
    totalAmount: Number(api.total),
    amountPaid: Number(api.amountPaid),
    balanceDue: Number(api.balance),
    paymentStatus: api.paymentStatus === 'PAID' ? 'PAID' : api.paymentStatus === 'PARTIALLY_PAID' ? 'PARTIAL' : 'UNPAID',
    statusHistory: [],
    payments: [],
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

export function LaundryPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLaundryBoard();
      const flattened: Order[] = [];
      for (const stage of Object.keys(data.columns ?? {})) {
        flattened.push(...(data.columns[stage] ?? []).map(mapApiOrderToOrder));
      }
      setOrders(flattened);
    } catch (err) {
      setError(errorMessage(err, 'load the laundry board'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBoard();
  }, [fetchBoard]);

  const handleAdvance = async (orderId: string, currentStage: LaundryStage) => {
    const stageKeys = STAGES.map((s) => s.key);
    const idx = stageKeys.indexOf(currentStage);
    if (idx < stageKeys.length - 1) {
      const nextStage = stageKeys[idx + 1];
      setError(null);
      try {
        await updateOrderStatus(orderId, {
          status: nextStage,
          notes: `Advanced from ${currentStage} to ${nextStage}`,
        });
        await fetchBoard();
      } catch (err) {
        setError(errorMessage(err, 'move this order to the next stage'));
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Laundry Work Board"
        description="Garment processing Kanban queue. Track and advance clothes through each operational stage."
        action={
          <Button variant="secondary" size="sm" onClick={() => fetchBoard()} disabled={loading}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Board
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <LoadError message={error} onRetry={() => void fetchBoard()} />
        </div>
      )}

      {/* Kanban Columns Row */}
      <div className="flex-1 flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stageInfo) => {
          const stageOrders = orders.filter((o) => o.currentStage === stageInfo.key);

          return (
            <div
              key={stageInfo.key}
              className="w-72 shrink-0 flex flex-col rounded-lg border border-border bg-surface/80 p-3"
            >
              {/* Stage Header */}
              <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
                <div>
                  <h2 className="text-xs font-bold text-text flex items-center gap-1.5">
                    {stageInfo.label}
                    <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {stageOrders.length}
                    </span>
                  </h2>
                  <span className="text-[10px] text-text-muted">{stageInfo.description}</span>
                </div>
              </div>

              {/* Column Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {stageOrders.length === 0 ? (
                  <div className="rounded border border-dashed border-border/70 p-4 text-center text-xs text-text-muted">
                    No orders in this stage.
                  </div>
                ) : (
                  stageOrders.map((order) => {
                    const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

                    return (
                      <div
                        key={order.id}
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="cursor-pointer rounded-lg border border-border bg-surface p-3 shadow-sm hover:border-primary transition-all space-y-2.5"
                      >
                        {/* Order Header */}
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-primary font-mono">
                            {order.orderNumber}
                          </span>
                          <ServiceTierBadge tier={order.serviceTier} />
                        </div>

                        {/* Customer Info */}
                        <div>
                          <div className="text-xs font-semibold text-text">{order.customerName}</div>
                          <div className="text-[11px] text-text-muted flex items-center gap-1">
                            <Tag className="h-3 w-3" /> {itemCount} garments
                          </div>
                        </div>

                        {/* Storage Box / Hanger Code */}
                        {(order.coverCode || order.bagCode) && (
                          <div className="flex gap-2 text-[10px] font-mono">
                            {order.coverCode && (
                              <span className="rounded bg-primary-light px-1.5 py-0.5 font-semibold text-primary">
                                {order.coverCode}
                              </span>
                            )}
                            {order.bagCode && (
                              <span className="rounded bg-border/40 px-1.5 py-0.5 text-text-muted">
                                {order.bagCode}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Action CTA */}
                        <div className="pt-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full justify-center text-[11px] font-semibold"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdvance(order.id, order.currentStage);
                            }}
                          >
                            Next Stage <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
