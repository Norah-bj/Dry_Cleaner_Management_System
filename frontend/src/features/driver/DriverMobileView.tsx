import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, MapPin, Package, Phone, Truck, RefreshCw } from 'lucide-react';
import { errorMessage } from '../../lib/error-message';
import { RunBadge } from '../../components/pickups/RunBadge';
import { getDriverTasks, updatePickup, updateDelivery, type ApiPickup, type ApiDelivery } from '../../services/logistics';

/**
 * Driver Mobile Web — lightweight page opened by drivers on their phone.
 * Route: /driver/:driverId
 * Intentionally minimal: large touch targets, no sidebar, status-advance only.
 */
export function DriverMobileView() {
  const driverId = window.location.pathname.split('/').pop() ?? '';
  const [driverName, setDriverName] = useState('Driver');
  const [pickups, setPickups] = useState<ApiPickup[]>([]);
  const [deliveries, setDeliveries] = useState<ApiDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getDriverTasks(driverId);
      if (res) {
        setPickups(res.pickups || []);
        setDeliveries(res.deliveries || []);
        if (res.pickups?.[0]?.assignedDriverName) {
          setDriverName(res.pickups[0].assignedDriverName);
        } else if (res.deliveries?.[0]?.assignedDriverName) {
          setDriverName(res.deliveries[0].assignedDriverName);
        }
      }
    } catch (err) {
      setError(errorMessage(err, 'load your jobs'));
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const activePickups = pickups.filter((p) => !['PICKED_UP', 'CANCELLED'].includes(p.status));
  const activeDeliveries = deliveries.filter((d) => !['DELIVERED', 'CANCELLED', 'FAILED'].includes(d.status));
  const doneToday = [
    ...pickups.filter((p) => p.status === 'PICKED_UP'),
    ...deliveries.filter((d) => d.status === 'DELIVERED'),
  ].length;

  const handleAdvancePickup = async (pickupId: string, currentStatus: string) => {
    let next = 'ON_THE_WAY';
    if (currentStatus === 'ON_THE_WAY' || currentStatus === 'DRIVER_ASSIGNED' || currentStatus === 'SCHEDULED') {
      next = currentStatus === 'ON_THE_WAY' ? 'PICKED_UP' : 'ON_THE_WAY';
    }
    setError(null);
    try {
      await updatePickup(pickupId, { status: next });
      await fetchTasks();
    } catch (err) {
      setError(errorMessage(err, 'update this pickup'));
    }
  };

  const handleAdvanceDelivery = async (deliveryId: string, currentStatus: string) => {
    let next = 'OUT_FOR_DELIVERY';
    if (currentStatus === 'OUT_FOR_DELIVERY' || currentStatus === 'DRIVER_ASSIGNED' || currentStatus === 'SCHEDULED') {
      next = currentStatus === 'OUT_FOR_DELIVERY' ? 'DELIVERED' : 'OUT_FOR_DELIVERY';
    }
    setError(null);
    try {
      await updateDelivery(deliveryId, { status: next });
      await fetchTasks();
    } catch (err) {
      setError(errorMessage(err, 'update this delivery'));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary px-4 pt-safe-top pb-4 text-white">
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
              {driverName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-xs opacity-75">Driver Task Portal — EBENEZER</div>
              <div className="font-bold text-base">{driverName}</div>
            </div>
          </div>
          <button
            onClick={() => fetchTasks()}
            disabled={loading}
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
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
        {error && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {/* ── Active Pickups ── */}
        {activePickups.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-text uppercase tracking-wider">
              <Package className="h-4 w-4 text-primary" /> Pickups ({activePickups.length})
            </h2>
            <div className="space-y-3">
              {activePickups.map((p) => (
                <div key={p.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-primary">{p.pickupNumber}</span>
                    <RunBadge status={p.status as any} type="pickup" />
                  </div>

                  <div className="text-base font-semibold text-text">{p.customer?.name || 'Customer'}</div>

                  <div className="space-y-1.5 text-sm text-text-muted">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{p.pickupAddress}</span>
                    </div>
                    {p.customer?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0" />
                        <a href={`tel:${p.customer.phone}`} className="text-primary font-medium">
                          {p.customer.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {p.notes && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
                      {p.notes}
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      onClick={() => handleAdvancePickup(p.id, p.status)}
                      className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white shadow hover:bg-primary-dark active:scale-98 transition-all flex items-center justify-center gap-2"
                    >
                      {p.status === 'ON_THE_WAY' ? (
                        <>
                          <CheckCircle className="h-4 w-4" /> Mark as Picked Up ✓
                        </>
                      ) : (
                        <>
                          <Truck className="h-4 w-4" /> I'm On The Way →
                        </>
                      )}
                    </button>
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
              <Truck className="h-4 w-4 text-emerald-600" /> Deliveries ({activeDeliveries.length})
            </h2>
            <div className="space-y-3">
              {activeDeliveries.map((d) => (
                <div key={d.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-primary">{d.deliveryNumber}</span>
                    <RunBadge status={d.status as any} type="delivery" />
                  </div>

                  <div className="text-base font-semibold text-text">{d.order?.customer?.name || 'Customer'}</div>

                  <div className="space-y-1.5 text-sm text-text-muted">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{d.deliveryAddress}</span>
                    </div>
                    {d.order?.customer?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0" />
                        <a href={`tel:${d.order.customer.phone}`} className="text-primary font-medium">
                          {d.order.customer.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {Number(d.amountCollectable) > 0 && (
                    <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800 font-semibold flex justify-between items-center">
                      <span>Collect Cash / MoMo on Delivery:</span>
                      <span className="font-mono text-sm font-bold text-rose-700">
                        {Number(d.amountCollectable).toLocaleString()} RWF
                      </span>
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      onClick={() => handleAdvanceDelivery(d.id, d.status)}
                      className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow hover:bg-emerald-700 active:scale-98 transition-all flex items-center justify-center gap-2"
                    >
                      {d.status === 'OUT_FOR_DELIVERY' ? (
                        <>
                          <CheckCircle className="h-4 w-4" /> Delivered & Collected ✓
                        </>
                      ) : (
                        <>
                          <Truck className="h-4 w-4" /> Out for Delivery →
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {activePickups.length === 0 && activeDeliveries.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-3">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
            <h3 className="font-bold text-base text-text">All runs completed!</h3>
            <p className="text-xs text-text-muted">
              You have no pending pickups or deliveries assigned right now. Great job!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
