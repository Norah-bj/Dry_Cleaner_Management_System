import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, MapPin, Package, Phone, Truck, XCircle } from 'lucide-react';
import { pickupDeliveryStore } from '../../mock/mock-pickup-delivery-store';
import { RunBadge } from '../../components/pickups/RunBadge';

/**
 * Driver Mobile Web — lightweight page opened by drivers on their phone.
 * Route: /driver/:driverId
 * Intentionally minimal: large touch targets, no sidebar, status-advance only.
 */
export function DriverMobileView() {
  // Read driverId from URL path: /driver/<id>
  const driverId = window.location.pathname.split('/').pop() ?? '';
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => { const unsub = pickupDeliveryStore.subscribe(refresh); return () => { unsub(); }; }, [refresh]);

  const driver = pickupDeliveryStore.getDrivers().find((d) => d.id === driverId);
  const allPickups = pickupDeliveryStore.getPickups().filter((p) => p.driverId === driverId);
  const allDeliveries = pickupDeliveryStore.getDeliveries().filter((d) => d.driverId === driverId);

  const activePickups = allPickups.filter((p) => !['PICKED_UP', 'CANCELLED'].includes(p.status));
  const activeDeliveries = allDeliveries.filter((d) => !['DELIVERED', 'CANCELLED', 'FAILED'].includes(d.status));
  const doneToday = [
    ...allPickups.filter((p) => p.status === 'PICKED_UP'),
    ...allDeliveries.filter((d) => d.status === 'DELIVERED'),
  ].length;

  if (!driver) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <Truck className="mb-4 h-12 w-12 text-text-muted" />
        <h1 className="text-lg font-bold text-text">Driver not found</h1>
        <p className="mt-2 text-sm text-text-muted">Check the link sent to you by the shop.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary px-4 pt-safe-top pb-4 text-white">
        <div className="flex items-center gap-3 pt-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
            {driver.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <div className="text-xs opacity-75">Driver View — EBENEZER</div>
            <div className="font-bold text-base">{driver.name}</div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-white/10 py-2">
            <div className="text-lg font-bold">{activePickups.length}</div>
            <div className="text-[10px] opacity-75">Pickups</div>
          </div>
          <div className="rounded-lg bg-white/10 py-2">
            <div className="text-lg font-bold">{activeDeliveries.length}</div>
            <div className="text-[10px] opacity-75">Deliveries</div>
          </div>
          <div className="rounded-lg bg-white/10 py-2">
            <div className="text-lg font-bold">{doneToday}</div>
            <div className="text-[10px] opacity-75">Done Today</div>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* ── Active Pickups ── */}
        {activePickups.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-text uppercase tracking-wider">
              <Package className="h-4 w-4 text-primary" /> Pickups
            </h2>
            <div className="space-y-3">
              {activePickups.map((p) => (
                <div key={p.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-primary">{p.requestNumber}</span>
                    <RunBadge status={p.status} type="pickup" />
                  </div>

                  <div className="text-base font-semibold text-text">{p.customerName}</div>

                  <div className="space-y-1.5 text-sm text-text-muted">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{p.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0" />
                      <a href={`tel:${p.customerPhone}`} className="text-primary font-medium">
                        {p.customerPhone}
                      </a>
                    </div>
                  </div>

                  {p.notes && (
                    <div className="rounded bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                      📝 {p.notes}
                    </div>
                  )}

                  <div className="text-xs text-text-muted">
                    ⏰ {p.preferredTimeFrom} – {p.preferredTimeTo}
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {p.status === 'DRIVER_ASSIGNED' && (
                      <button
                        type="button"
                        className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white active:scale-95 transition-transform"
                        onClick={() => { pickupDeliveryStore.updatePickupStatus(p.id, 'ON_THE_WAY'); refresh(); }}
                      >
                        <Truck className="h-4 w-4" /> I'm On the Way
                      </button>
                    )}
                    {p.status === 'ON_THE_WAY' && (
                      <button
                        type="button"
                        className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white active:scale-95 transition-transform"
                        onClick={() => { pickupDeliveryStore.updatePickupStatus(p.id, 'PICKED_UP'); refresh(); }}
                      >
                        <CheckCircle className="h-4 w-4" /> Picked Up ✓
                      </button>
                    )}
                    <button
                      type="button"
                      className="flex items-center justify-center gap-1 rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-600 active:bg-rose-50 transition-colors"
                      onClick={() => { pickupDeliveryStore.updatePickupStatus(p.id, 'CANCELLED'); refresh(); }}
                    >
                      <XCircle className="h-4 w-4" /> Cancel
                    </button>
                    <a
                      href={`tel:${p.customerPhone}`}
                      className="flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text"
                    >
                      <Phone className="h-4 w-4" /> Call
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Active Deliveries ── */}
        {activeDeliveries.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-text uppercase tracking-wider">
              <Truck className="h-4 w-4 text-primary" /> Deliveries
            </h2>
            <div className="space-y-3">
              {activeDeliveries.map((d) => (
                <div key={d.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-primary">{d.requestNumber}</span>
                    <RunBadge status={d.status} type="delivery" />
                  </div>

                  <div className="text-base font-semibold text-text">{d.customerName}</div>
                  <div className="font-mono text-xs text-text-muted">{d.orderNumber}</div>

                  <div className="space-y-1.5 text-sm text-text-muted">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{d.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0" />
                      <a href={`tel:${d.customerPhone}`} className="text-primary font-medium">
                        {d.customerPhone}
                      </a>
                    </div>
                  </div>

                  {d.amountCollectable > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-rose-50 border border-rose-200 px-3 py-2">
                      <span className="text-sm font-semibold text-rose-800">💰 Collect on delivery</span>
                      <span className="font-mono font-bold text-rose-700 text-base">
                        {d.amountCollectable.toLocaleString()} RWF
                      </span>
                    </div>
                  )}

                  {d.notes && (
                    <div className="rounded bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                      📝 {d.notes}
                    </div>
                  )}

                  <div className="text-xs text-text-muted">
                    ⏰ {d.scheduledTimeFrom} – {d.scheduledTimeTo}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {d.status === 'DRIVER_ASSIGNED' && (
                      <button
                        type="button"
                        className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white active:scale-95 transition-transform"
                        onClick={() => { pickupDeliveryStore.updateDeliveryStatus(d.id, 'OUT_FOR_DELIVERY'); refresh(); }}
                      >
                        <Truck className="h-4 w-4" /> Out for Delivery
                      </button>
                    )}
                    {d.status === 'OUT_FOR_DELIVERY' && (
                      <button
                        type="button"
                        className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white active:scale-95 transition-transform"
                        onClick={() => { pickupDeliveryStore.updateDeliveryStatus(d.id, 'DELIVERED'); refresh(); }}
                      >
                        <CheckCircle className="h-4 w-4" /> Delivered ✓
                      </button>
                    )}
                    <button
                      type="button"
                      className="flex items-center justify-center gap-1 rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-600"
                      onClick={() => { pickupDeliveryStore.updateDeliveryStatus(d.id, 'FAILED'); refresh(); }}
                    >
                      <XCircle className="h-4 w-4" /> Failed
                    </button>
                    <a
                      href={`tel:${d.customerPhone}`}
                      className="flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text"
                    >
                      <Phone className="h-4 w-4" /> Call
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Empty state ── */}
        {activePickups.length === 0 && activeDeliveries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle className="mb-4 h-14 w-14 text-emerald-500" />
            <h2 className="text-lg font-bold text-text">All done!</h2>
            <p className="mt-2 text-sm text-text-muted">
              No active runs assigned to you right now.
            </p>
            <p className="mt-1 text-sm text-text-muted">
              {doneToday > 0 ? `You completed ${doneToday} run${doneToday > 1 ? 's' : ''} today. Great work! 🎉` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
