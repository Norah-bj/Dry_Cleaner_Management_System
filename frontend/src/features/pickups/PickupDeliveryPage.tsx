import { useState, useEffect, useCallback } from 'react';
import { MapPin, Phone, Truck, Plus, RefreshCw, User } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { RunBadge } from '../../components/pickups/RunBadge';
import { pickupDeliveryStore } from '../../mock/mock-pickup-delivery-store';
import { listPickups, listDeliveries, updatePickup, updateDelivery, type ApiPickup, type ApiDelivery } from '../../services/logistics';
import { cn } from '../../lib/cn';

const TABS = ['Pickups', 'Deliveries', 'Drivers'] as const;

const PICKUP_NEXT: Partial<Record<string, string>> = {
  REQUESTED: 'SCHEDULED',
  SCHEDULED: 'DRIVER_ASSIGNED',
  DRIVER_ASSIGNED: 'ON_THE_WAY',
  ON_THE_WAY: 'PICKED_UP',
};

const DELIVERY_NEXT: Partial<Record<string, string>> = {
  SCHEDULED: 'DRIVER_ASSIGNED',
  DRIVER_ASSIGNED: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
};

function formatDate(dateStr: string) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function PickupDeliveryPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Pickups');
  const [pickups, setPickups] = useState<ApiPickup[]>([]);
  const [deliveries, setDeliveries] = useState<ApiDelivery[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogistics = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, dRes] = await Promise.all([listPickups(), listDeliveries()]);
      if (pRes && pRes.data) setPickups(pRes.data);
      if (dRes && dRes.data) setDeliveries(dRes.data);
    } catch {
      // Mock store fallback
      const mockP = pickupDeliveryStore.getPickups().map((p) => ({
        id: p.id,
        pickupNumber: p.requestNumber,
        customerId: p.customerId,
        customer: { id: p.customerId, name: p.customerName, phone: p.customerPhone },
        pickupAddress: p.address,
        scheduledDate: p.preferredDate,
        timeSlot: `${p.preferredTimeFrom} - ${p.preferredTimeTo}`,
        status: p.status as any,
        assignedDriverId: p.driverId,
        assignedDriverName: p.driverName,
        notes: p.notes,
        createdAt: p.createdAt,
      }));
      const mockD = pickupDeliveryStore.getDeliveries().map((d) => ({
        id: d.id,
        deliveryNumber: d.requestNumber,
        orderId: d.orderId,
        order: { id: d.orderId, orderNumber: d.orderNumber, customer: { name: d.customerName, phone: d.customerPhone } },
        deliveryAddress: d.address,
        scheduledDate: d.scheduledDate,
        timeSlot: `${d.scheduledTimeFrom} - ${d.scheduledTimeTo}`,
        amountCollectable: d.amountCollectable,
        status: d.status as any,
        assignedDriverId: d.driverId,
        assignedDriverName: d.driverName,
        notes: d.notes,
        createdAt: d.createdAt,
      }));
      setPickups(mockP);
      setDeliveries(mockD);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogistics();
  }, [fetchLogistics]);

  const handleAdvancePickup = async (pickupId: string, currentStatus: string) => {
    const next = PICKUP_NEXT[currentStatus];
    if (!next) return;
    try {
      await updatePickup(pickupId, { status: next });
      await fetchLogistics();
    } catch {
      pickupDeliveryStore.updatePickupStatus(pickupId, next as any);
      fetchLogistics();
    }
  };

  const handleAdvanceDelivery = async (deliveryId: string, currentStatus: string) => {
    const next = DELIVERY_NEXT[currentStatus];
    if (!next) return;
    try {
      await updateDelivery(deliveryId, { status: next });
      await fetchLogistics();
    } catch {
      pickupDeliveryStore.updateDeliveryStatus(deliveryId, next as any);
      fetchLogistics();
    }
  };

  const drivers = pickupDeliveryStore.getDrivers();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPickupsCount = pickups.filter((p) => p.scheduledDate === todayStr).length;
  const todayDeliveriesCount = deliveries.filter((d) => d.scheduledDate === todayStr).length;
  const totalCollectable = deliveries
    .filter((d) => d.status !== 'DELIVERED' && d.status !== 'CANCELLED')
    .reduce((s, d) => s + Number(d.amountCollectable), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pickups & Deliveries"
        description="Dispatch drivers, manage doorstep collections, and track customer garment returns."
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => fetchLogistics()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setTab('Pickups')}>
              <Plus className="mr-1 h-4 w-4" /> Schedule Pickup
            </Button>
          </div>
        }
      />

      {/* Summary metric banner */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Today's Pickups</div>
          <div className="text-xl font-bold text-primary">{todayPickupsCount}</div>
          <div className="text-[11px] text-text-muted mt-1">Pending collections</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Today's Deliveries</div>
          <div className="text-xl font-bold text-emerald-600">{todayDeliveriesCount}</div>
          <div className="text-[11px] text-text-muted mt-1">Outbound orders</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">To Collect on Delivery</div>
          <div className="text-xl font-bold text-rose-600 font-mono">
            {totalCollectable.toLocaleString()} <span className="text-sm font-medium">RWF</span>
          </div>
          <div className="text-[11px] text-rose-500 mt-1">Outstanding run cash</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Active Fleet Drivers</div>
          <div className="text-xl font-bold text-text">{drivers.length}</div>
          <div className="text-[11px] text-text-muted mt-1">Assigned & available</div>
        </Card>
      </div>

      {/* Tabs bar */}
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
          </button>
        ))}
      </div>

      {/* Tab 1: Pickups */}
      {tab === 'Pickups' && (
        <div className="space-y-4">
          {pickups.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Truck}
                title="No pickups scheduled"
                description="Customers can request pickups online, or you can record one at the counter."
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pickups.map((p) => (
                <Card key={p.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary">{p.pickupNumber}</span>
                    <RunBadge status={p.status as any} type="pickup" />
                  </div>

                  <div>
                    <div className="text-sm font-bold text-text">{p.customer?.name || 'Customer'}</div>
                    <div className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" /> {p.customer?.phone || '—'}
                    </div>
                  </div>

                  <div className="text-xs text-text-muted flex items-start gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{p.pickupAddress}</span>
                  </div>

                  <div className="text-[11px] text-text-muted">
                    Scheduled: <strong className="text-text">{formatDate(p.scheduledDate)}</strong> ({p.timeSlot})
                  </div>

                  {p.assignedDriverName && (
                    <div className="text-xs text-purple-700 flex items-center gap-1 font-medium">
                      <User className="h-3 w-3" /> {p.assignedDriverName}
                    </div>
                  )}

                  {PICKUP_NEXT[p.status] && p.status !== 'PICKED_UP' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full justify-center text-xs"
                      onClick={() => handleAdvancePickup(p.id, p.status)}
                    >
                      Advance to {PICKUP_NEXT[p.status]?.replace('_', ' ')} $\rightarrow$
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Deliveries */}
      {tab === 'Deliveries' && (
        <div className="space-y-4">
          {deliveries.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Truck}
                title="No deliveries scheduled"
                description="Ready orders can be dispatched for doorstep delivery."
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {deliveries.map((d) => (
                <Card key={d.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary">{d.deliveryNumber}</span>
                    <RunBadge status={d.status as any} type="delivery" />
                  </div>

                  <div>
                    <div className="text-sm font-bold text-text">{d.order?.customer?.name || 'Customer'}</div>
                    <div className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" /> {d.order?.customer?.phone || '—'}
                    </div>
                  </div>

                  <div className="text-xs text-text-muted flex items-start gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{d.deliveryAddress}</span>
                  </div>

                  {Number(d.amountCollectable) > 0 && (
                    <div className="rounded bg-rose-50 border border-rose-200 p-2 text-xs font-semibold text-rose-800 flex justify-between">
                      <span>Collect on Delivery:</span>
                      <span className="font-mono font-bold">{Number(d.amountCollectable).toLocaleString()} RWF</span>
                    </div>
                  )}

                  {DELIVERY_NEXT[d.status] && d.status !== 'DELIVERED' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full justify-center text-xs"
                      onClick={() => handleAdvanceDelivery(d.id, d.status)}
                    >
                      Advance to {DELIVERY_NEXT[d.status]?.replace('_', ' ')} $\rightarrow$
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Drivers */}
      {tab === 'Drivers' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {drivers.map((drv) => (
            <Card key={drv.id} className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {drv.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-sm text-text">{drv.name}</div>
                  <div className="text-xs text-text-muted">{drv.phone}</div>
                </div>
              </div>

              <div className="border-t border-border pt-2 text-xs space-y-1">
                <div className="flex justify-between text-text-muted">
                  <span>Vehicle:</span>
                  <span className="font-medium text-text">{drv.vehicleType}</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Plate Number:</span>
                  <span className="font-mono text-text">{drv.plateNumber}</span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={`/driver/${drv.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center rounded-md border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-colors"
                >
                  Open Driver Mobile View $\rightarrow$
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
