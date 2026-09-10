import { useState, useEffect, useCallback } from 'react';
import { MapPin, Phone, Truck, Plus, RefreshCw, User } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { RunBadge } from '../../components/pickups/RunBadge';
import { pickupDeliveryStore } from '../../mock/mock-pickup-delivery-store';
import { cn } from '../../lib/cn';
import type { PickupRequest, DeliveryRequest, PickupStatus, DeliveryStatus } from '../../types/pickup-delivery';

const TABS = ['Pickups', 'Deliveries', 'Drivers'] as const;

const PICKUP_NEXT: Partial<Record<PickupStatus, PickupStatus>> = {
  REQUESTED: 'SCHEDULED',
  SCHEDULED: 'DRIVER_ASSIGNED',
  DRIVER_ASSIGNED: 'ON_THE_WAY',
  ON_THE_WAY: 'PICKED_UP',
};

const DELIVERY_NEXT: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  SCHEDULED: 'DRIVER_ASSIGNED',
  DRIVER_ASSIGNED: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
};

function groupByDate<T extends { preferredDate?: string; scheduledDate?: string }>(
  items: T[],
  key: 'preferredDate' | 'scheduledDate',
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const d = item[key] ?? 'Unknown';
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(item);
  }
  return map;
}

function formatDate(dateStr: string) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ── Pickup Card ───────────────────────────────────────────────────────────────
function PickupCard({ pickup, onAdvance }: { pickup: PickupRequest; onAdvance: () => void }) {
  const drivers = pickupDeliveryStore.getDrivers();
  const nextStatus = PICKUP_NEXT[pickup.status];

  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-primary">{pickup.requestNumber}</span>
            <RunBadge status={pickup.status} type="pickup" />
          </div>
          <div className="mt-1 text-sm font-semibold text-text">{pickup.customerName}</div>
        </div>
        <div className="text-right text-xs text-text-muted">
          <div>{pickup.preferredTimeFrom} – {pickup.preferredTimeTo}</div>
        </div>
      </div>

      <div className="flex items-start gap-1.5 text-xs text-text-muted">
        <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
        <span>{pickup.address}</span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        <Phone className="h-3 w-3 shrink-0" />
        <span>{pickup.customerPhone}</span>
      </div>

      {pickup.driverName && (
        <div className="flex items-center gap-1.5 text-xs">
          <User className="h-3 w-3 text-purple-600" />
          <span className="text-purple-700 font-medium">{pickup.driverName}</span>
        </div>
      )}

      {pickup.notes && (
        <div className="rounded bg-amber-50 border border-amber-200 px-2 py-1 text-xs text-amber-800">
          {pickup.notes}
        </div>
      )}

      {nextStatus && pickup.status !== 'PICKED_UP' && pickup.status !== 'CANCELLED' && (
        <div className="flex gap-2">
          {nextStatus === 'DRIVER_ASSIGNED' ? (
            <select
              className="flex-1 rounded border border-border bg-background px-2 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  pickupDeliveryStore.updatePickupStatus(pickup.id, 'DRIVER_ASSIGNED', e.target.value);
                  onAdvance();
                }
              }}
            >
              <option value="" disabled>Assign driver…</option>
              {drivers.filter((d) => d.isAvailable).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          ) : (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => {
                pickupDeliveryStore.updatePickupStatus(pickup.id, nextStatus);
                onAdvance();
              }}
            >
              Mark as {nextStatus.replace('_', ' ')}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-rose-600 hover:bg-rose-50"
            onClick={() => {
              pickupDeliveryStore.updatePickupStatus(pickup.id, 'CANCELLED');
              onAdvance();
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Delivery Card ─────────────────────────────────────────────────────────────
function DeliveryCard({ delivery, onAdvance }: { delivery: DeliveryRequest; onAdvance: () => void }) {
  const drivers = pickupDeliveryStore.getDrivers();
  const nextStatus = DELIVERY_NEXT[delivery.status];

  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-primary">{delivery.requestNumber}</span>
            <RunBadge status={delivery.status} type="delivery" />
          </div>
          <div className="mt-1 text-sm font-semibold text-text">{delivery.customerName}</div>
          <div className="text-xs text-text-muted font-mono">{delivery.orderNumber}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-text-muted">{delivery.scheduledTimeFrom} – {delivery.scheduledTimeTo}</div>
          {delivery.amountCollectable > 0 && (
            <div className="mt-1 rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
              Collect {delivery.amountCollectable.toLocaleString()} RWF
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-1.5 text-xs text-text-muted">
        <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
        <span>{delivery.address}</span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        <Phone className="h-3 w-3 shrink-0" />
        <span>{delivery.customerPhone}</span>
      </div>

      {delivery.driverName && (
        <div className="flex items-center gap-1.5 text-xs">
          <User className="h-3 w-3 text-purple-600" />
          <span className="text-purple-700 font-medium">{delivery.driverName}</span>
        </div>
      )}

      {delivery.notes && (
        <div className="rounded bg-amber-50 border border-amber-200 px-2 py-1 text-xs text-amber-800">
          {delivery.notes}
        </div>
      )}

      {nextStatus && delivery.status !== 'DELIVERED' && delivery.status !== 'CANCELLED' && delivery.status !== 'FAILED' && (
        <div className="flex gap-2">
          {nextStatus === 'DRIVER_ASSIGNED' ? (
            <select
              className="flex-1 rounded border border-border bg-background px-2 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  pickupDeliveryStore.updateDeliveryStatus(delivery.id, 'DRIVER_ASSIGNED', e.target.value);
                  onAdvance();
                }
              }}
            >
              <option value="" disabled>Assign driver…</option>
              {drivers.filter((d) => d.isAvailable).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          ) : (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => {
                pickupDeliveryStore.updateDeliveryStatus(delivery.id, nextStatus);
                onAdvance();
              }}
            >
              Mark as {nextStatus.replace(/_/g, ' ')}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-rose-600 hover:bg-rose-50"
            onClick={() => {
              pickupDeliveryStore.updateDeliveryStatus(delivery.id, 'CANCELLED');
              onAdvance();
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function PickupDeliveryPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Pickups');
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => { const unsub = pickupDeliveryStore.subscribe(refresh); return () => { unsub(); }; }, [refresh]);

  const pickups = pickupDeliveryStore.getPickups();
  const deliveries = pickupDeliveryStore.getDeliveries();
  const drivers = pickupDeliveryStore.getDrivers();

  const todayPickups = pickupDeliveryStore.getTodayPickups();
  const todayDeliveries = pickupDeliveryStore.getTodayDeliveries();

  const pickupGroups = groupByDate(pickups, 'preferredDate');
  const deliveryGroups = groupByDate(deliveries, 'scheduledDate');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pickup & Delivery"
        description="Manage today's runs and assign drivers."
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              pickupDeliveryStore.resetToDefaults();
              refresh();
            }}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reset Demo Data
          </Button>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Today's Pickups</div>
          <div className="text-2xl font-bold text-primary">{todayPickups.length}</div>
          <div className="text-xs text-text-muted mt-1">
            {todayPickups.filter((p) => p.status === 'PICKED_UP').length} completed
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Today's Deliveries</div>
          <div className="text-2xl font-bold text-primary">{todayDeliveries.length}</div>
          <div className="text-xs text-text-muted mt-1">
            {todayDeliveries.filter((d) => d.status === 'DELIVERED').length} delivered
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">To Collect (RWF)</div>
          <div className="text-2xl font-bold text-rose-600 font-mono">
            {todayDeliveries.reduce((a, d) => a + d.amountCollectable, 0).toLocaleString()}
          </div>
          <div className="text-xs text-text-muted mt-1">on delivery payments</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-text-muted mb-1">Active Drivers</div>
          <div className="text-2xl font-bold text-emerald-600">
            {drivers.filter((d) => d.isAvailable).length}
          </div>
          <div className="text-xs text-text-muted mt-1">
            of {drivers.length} available
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
            {t === 'Pickups' && (
              <span className="ml-1.5 rounded-full bg-border/40 px-1.5 py-0.5 text-[10px]">
                {pickups.length}
              </span>
            )}
            {t === 'Deliveries' && (
              <span className="ml-1.5 rounded-full bg-border/40 px-1.5 py-0.5 text-[10px]">
                {deliveries.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Pickups Tab ── */}
      {tab === 'Pickups' && (
        <div className="space-y-6">
          {pickups.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={Truck} title="No pickups yet" description="Pickup requests from customers will appear here." />
            </Card>
          ) : (
            Array.from(pickupGroups.entries()).map(([date, items]) => (
              <div key={date}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-sm font-semibold text-text">{formatDate(date)}</span>
                  <div className="flex-1 border-t border-border" />
                  <span className="text-xs text-text-muted">{items.length} request{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((p) => (
                    <PickupCard key={p.id} pickup={p} onAdvance={refresh} />
                  ))}
                </div>
              </div>
            ))
          )}
          <div className="flex justify-center">
            <Button variant="secondary" onClick={() => alert('New Pickup form — coming in API phase')}>
              <Plus className="mr-1 h-4 w-4" /> New Pickup Request
            </Button>
          </div>
        </div>
      )}

      {/* ── Deliveries Tab ── */}
      {tab === 'Deliveries' && (
        <div className="space-y-6">
          {deliveries.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={Truck} title="No deliveries scheduled" description="Deliveries will appear here once orders are ready." />
            </Card>
          ) : (
            Array.from(deliveryGroups.entries()).map(([date, items]) => (
              <div key={date}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-sm font-semibold text-text">{formatDate(date)}</span>
                  <div className="flex-1 border-t border-border" />
                  <span className="text-xs text-text-muted">{items.length} delivery{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((d) => (
                    <DeliveryCard key={d.id} delivery={d} onAdvance={refresh} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Drivers Tab ── */}
      {tab === 'Drivers' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drivers.map((driver) => {
            const driverPickups = pickups.filter(
              (p) => p.driverId === driver.id && !['PICKED_UP', 'CANCELLED'].includes(p.status),
            );
            const driverDeliveries = deliveries.filter(
              (d) => d.driverId === driver.id && !['DELIVERED', 'CANCELLED', 'FAILED'].includes(d.status),
            );
            return (
              <Card key={driver.id} className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {driver.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-text text-sm">{driver.name}</div>
                    <div className="text-xs text-text-muted">{driver.phone}</div>
                  </div>
                  <span
                    className={cn(
                      'ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold',
                      driver.isAvailable
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {driver.isAvailable ? 'Available' : 'Busy'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="rounded bg-border/20 p-2">
                    <div className="text-lg font-bold text-primary">{driverPickups.length}</div>
                    <div className="text-text-muted">Active Pickups</div>
                  </div>
                  <div className="rounded bg-border/20 p-2">
                    <div className="text-lg font-bold text-primary">{driverDeliveries.length}</div>
                    <div className="text-text-muted">Active Deliveries</div>
                  </div>
                </div>
                <a
                  href={`/driver/${driver.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded border border-primary px-3 py-1.5 text-center text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
                >
                  Open Driver View →
                </a>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
