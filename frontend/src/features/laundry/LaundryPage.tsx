import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Tag } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { ServiceTierBadge } from '../../components/orders/ServiceTierBadge';
import { mockStore } from '../../mock/mock-store';
import type { LaundryStage, Order } from '../../types/order';

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

export function LaundryPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>(() => mockStore.getOrders());

  useEffect(() => {
    return mockStore.subscribe(() => {
      setOrders(mockStore.getOrders());
    });
  }, []);

  const handleAdvance = (orderId: string, currentStage: LaundryStage) => {
    const stageKeys = STAGES.map((s) => s.key);
    const idx = stageKeys.indexOf(currentStage);
    if (idx < stageKeys.length - 1) {
      const nextStage = stageKeys[idx + 1];
      mockStore.updateOrderStatus(orderId, nextStage, 'Laundry Staff Worker', `Advanced from ${currentStage} to ${nextStage}`);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Laundry Work Board"
        description="Garment processing Kanban queue. Track and advance clothes through each operational stage."
      />

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

                        {/* Cover / Bag Code */}
                        <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted">
                          {order.coverCode && <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">{order.coverCode}</span>}
                          {order.bagCode && <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">{order.bagCode}</span>}
                        </div>

                        {/* Card Actions */}
                        <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                          <span className="text-[10px] text-text-muted">
                            Due: {new Date(order.expectedCompletion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {stageInfo.key !== 'READY' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdvance(order.id, order.currentStage);
                              }}
                            >
                              Next Stage <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          )}
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
