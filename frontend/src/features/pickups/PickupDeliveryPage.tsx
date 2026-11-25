import { useCallback, useEffect, useState } from 'react';
import { MapPin, Phone, Plus, RefreshCw, Truck, User } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadError } from '../../components/ui/LoadError';
import { PageHeader } from '../../components/ui/PageHeader';
import { RunBadge } from '../../components/pickups/RunBadge';
import { cn } from '../../lib/cn';
import { errorMessage } from '../../lib/error-message';
import { listCustomers } from '../../services/customers';
import {
  createDelivery,
  createPickup,
  listDeliveries,
  listPickups,
  updateDelivery,
  updatePickup,
  type ApiDelivery,
  type ApiPickup,
} from '../../services/logistics';
import { listOrders } from '../../services/orders';
import { getSettings, listDrivers } from '../../services/settings';
import type { DeliveryStatus, PickupStatus } from '../../types/pickup-delivery';
import type { DriverOption } from '../../types/settings';

const TABS = ['Pickups', 'Deliveries', 'Drivers'] as const;

// Moving to DRIVER_ASSIGNED happens by choosing a driver, not with this button.
const PICKUP_NEXT: Partial<Record<string, string>> = {
  REQUESTED: 'SCHEDULED',
  DRIVER_ASSIGNED: 'ON_THE_WAY',
  ON_THE_WAY: 'PICKED_UP',
};
const DELIVERY_NEXT: Partial<Record<string, string>> = {
  DRIVER_ASSIGNED: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
};
const DONE = ['PICKED_UP', 'DELIVERED', 'CANCELLED', 'FAILED'];

const fieldClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none';

function formatDate(dateStr: string) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function label(status: string) {
  return status.replace(/_/g, ' ').toLowerCase();
}

function DriverSelect({
  drivers,
  value,
  onChange,
}: {
  drivers: DriverOption[];
  value: string | null | undefined;
  onChange: (id: string) => void;
}) {
  return (
    <select
      aria-label="Assign driver"
      value={value ?? ''}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs"
    >
      <option value="">{drivers.length === 0 ? 'No driver logins yet' : 'Assign a driver…'}</option>
      {drivers.map((d) => (
        <option key={d.id} value={d.id}>{d.fullName}</option>
      ))}
    </select>
  );
}

type FormMode = 'pickup' | 'delivery' | null;

export function PickupDeliveryPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Pickups');
  const [pickups, setPickups] = useState<ApiPickup[]>([]);
  const [deliveries, setDeliveries] = useState<ApiDelivery[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [lookup, setLookup] = useState('');
  const [found, setFound] = useState<{ id: string; label: string; address: string } | null>(null);
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [slot, setSlot] = useState('');
  const [driverId, setDriverId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, dRes, drv, s] = await Promise.all([listPickups(), listDeliveries(), listDrivers(), getSettings()]);
      setPickups(pRes.data);
      setDeliveries(dRes.data);
      setDrivers(drv);
      setTimeSlots(s.timeSlots);
    } catch (err) {
      setError(errorMessage(err, 'load pickups and deliveries'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const act = async (action: () => Promise<unknown>, what: string) => {
    setError(null);
    try {
      await action();
      await fetchAll();
    } catch (err) {
      setError(errorMessage(err, what));
    }
  };

  const assignPickup = (p: ApiPickup, id: string) =>
    act(
      () => updatePickup(p.id, { assignedDriverId: id, ...(['REQUESTED', 'SCHEDULED'].includes(p.status) && { status: 'DRIVER_ASSIGNED' }) }),
      'assign this driver',
    );
  const assignDelivery = (d: ApiDelivery, id: string) =>
    act(
      () => updateDelivery(d.id, { assignedDriverId: id, ...(d.status === 'SCHEDULED' && { status: 'DRIVER_ASSIGNED' }) }),
      'assign this driver',
    );

  const openForm = (mode: FormMode) => {
    setFormMode(mode);
    setLookup('');
    setFound(null);
    setAddress('');
    setSlot(timeSlots[0] ?? '');
    setDriverId('');
    setFormError(null);
  };

  const doLookup = async () => {
    setFormError(null);
    setFound(null);
    try {
      if (formMode === 'pickup') {
        const res = await listCustomers({ search: lookup.trim() });
        const c = res.data[0];
        if (!c) return setFormError('No customer found. Register them under Customers first.');
        setFound({ id: c.id, label: `${c.name} · ${c.phone}`, address: c.address ?? '' });
        setAddress(c.address ?? '');
      } else {
        const res = await listOrders({ search: lookup.trim() });
        const o = res.data.find((x) => x.orderNumber.toUpperCase() === lookup.trim().toUpperCase()) ?? res.data[0];
        if (!o) return setFormError('No order found with that number.');
        setFound({
          id: o.id,
          label: `${o.orderNumber} · ${o.customer?.name ?? ''} · balance ${Number(o.balance).toLocaleString()} RWF`,
          address: o.customer?.address ?? '',
        });
        setAddress(o.customer?.address ?? '');
      }
    } catch (err) {
      setFormError(errorMessage(err, 'look this up'));
    }
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!found) return;
    setSaving(true);
    setFormError(null);
    try {
      const common = { scheduledDate: date, timeSlot: slot || undefined, assignedDriverId: driverId || undefined };
      if (formMode === 'pickup') {
        await createPickup({ customerId: found.id, pickupAddress: address.trim(), status: driverId ? 'DRIVER_ASSIGNED' : 'SCHEDULED', ...common });
      } else {
        await createDelivery({ orderId: found.id, deliveryAddress: address.trim(), status: driverId ? 'DRIVER_ASSIGNED' : 'SCHEDULED', ...common });
      }
      setFormMode(null);
      await fetchAll();
    } catch (err) {
      setFormError(errorMessage(err, `schedule this ${formMode ?? 'job'}`));
    } finally {
      setSaving(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const totalCollectable = deliveries
    .filter((d) => !DONE.includes(d.status))
    .reduce((s, d) => s + Number(d.amountCollectable), 0);
  const jobsFor = (id: string) =>
    [...pickups, ...deliveries].filter((r) => r.assignedDriverId === id && !DONE.includes(r.status)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pickups & Deliveries"
        description="Schedule collections and returns, and assign them to your drivers."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => void fetchAll()} disabled={loading} aria-label="Refresh">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <Button variant="secondary" onClick={() => openForm('delivery')}>
              <Plus className="h-4 w-4" /> Schedule Delivery
            </Button>
            <Button onClick={() => openForm('pickup')}>
              <Plus className="h-4 w-4" /> Schedule Pickup
            </Button>
          </div>
        }
      />

      {error && <LoadError message={error} onRetry={() => void fetchAll()} />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4"><div className="mb-1 text-xs text-text-muted">Today's pickups</div><div className="text-xl font-bold text-primary">{pickups.filter((p) => p.scheduledDate === todayStr).length}</div></Card>
        <Card className="p-4"><div className="mb-1 text-xs text-text-muted">Today's deliveries</div><div className="text-xl font-bold text-emerald-600">{deliveries.filter((d) => d.scheduledDate === todayStr).length}</div></Card>
        <Card className="p-4"><div className="mb-1 text-xs text-text-muted">To collect on delivery</div><div className="font-mono text-xl font-bold text-rose-600">{totalCollectable.toLocaleString()} <span className="text-sm font-medium">RWF</span></div></Card>
        <Card className="p-4"><div className="mb-1 text-xs text-text-muted">Active drivers</div><div className="text-xl font-bold text-text">{drivers.length}</div></Card>
      </div>

      <div className="flex border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn('-mb-px border-b-2 px-4 py-2 text-xs font-semibold transition-colors', tab === t ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text')}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Pickups' && (
        pickups.length === 0 ? (
          <Card className="p-8"><EmptyState icon={Truck} title="No pickups scheduled" description="Customers can request one from the customer page, or use Schedule Pickup." /></Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pickups.map((p) => (
              <Card key={p.id} className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary">{p.pickupNumber}</span>
                  <RunBadge status={p.status as PickupStatus} type="pickup" />
                </div>
                <div>
                  <div className="text-sm font-bold">{p.customer?.name ?? 'Customer'}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-text-muted"><Phone className="h-3 w-3" /> {p.customer?.phone ?? '—'}</div>
                </div>
                <div className="flex items-start gap-1 text-xs text-text-muted"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><span>{p.pickupAddress}</span></div>
                <div className="text-[11px] text-text-muted">
                  <strong className="text-text">{formatDate(p.scheduledDate)}</strong>{p.timeSlot ? ` · ${p.timeSlot}` : ''}
                </div>
                {!DONE.includes(p.status) && (
                  <DriverSelect drivers={drivers} value={p.assignedDriverId} onChange={(id) => void assignPickup(p, id)} />
                )}
                {PICKUP_NEXT[p.status] && (
                  <Button size="sm" variant="secondary" className="w-full text-xs" onClick={() => void act(() => updatePickup(p.id, { status: PICKUP_NEXT[p.status] }), 'update this pickup')}>
                    Mark {label(PICKUP_NEXT[p.status] as string)} →
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'Deliveries' && (
        deliveries.length === 0 ? (
          <Card className="p-8"><EmptyState icon={Truck} title="No deliveries scheduled" description="Use Schedule Delivery for a ready order." /></Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {deliveries.map((d) => (
              <Card key={d.id} className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary">{d.deliveryNumber}</span>
                  <RunBadge status={d.status as DeliveryStatus} type="delivery" />
                </div>
                <div>
                  <div className="text-sm font-bold">{d.order?.customer?.name ?? 'Customer'}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-text-muted"><Phone className="h-3 w-3" /> {d.order?.customer?.phone ?? '—'}</div>
                </div>
                <div className="flex items-start gap-1 text-xs text-text-muted"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><span>{d.deliveryAddress}</span></div>
                <div className="text-[11px] text-text-muted">
                  <strong className="text-text">{formatDate(d.scheduledDate)}</strong>{d.timeSlot ? ` · ${d.timeSlot}` : ''}
                </div>
                {Number(d.amountCollectable) > 0 && (
                  <div className="flex justify-between rounded border border-rose-200 bg-rose-50 p-2 text-xs font-semibold text-rose-800">
                    <span>Collect on delivery</span><span className="font-mono">{Number(d.amountCollectable).toLocaleString()} RWF</span>
                  </div>
                )}
                {!DONE.includes(d.status) && (
                  <DriverSelect drivers={drivers} value={d.assignedDriverId} onChange={(id) => void assignDelivery(d, id)} />
                )}
                {DELIVERY_NEXT[d.status] && (
                  <Button size="sm" variant="secondary" className="w-full text-xs" onClick={() => void act(() => updateDelivery(d.id, { status: DELIVERY_NEXT[d.status] }), 'update this delivery')}>
                    Mark {label(DELIVERY_NEXT[d.status] as string)} →
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'Drivers' && (
        <div className="space-y-3">
          <p className="text-xs text-text-muted">
            Drivers sign in with their own login on their phone and see only their own jobs. Add drivers under Employees.
          </p>
          {drivers.length === 0 ? (
            <Card className="p-8"><EmptyState icon={User} title="No driver logins yet" description="Create a login with the Driver role under Employees." /></Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {drivers.map((drv) => (
                <Card key={drv.id} className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                    {drv.fullName.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{drv.fullName}</div>
                    {drv.phone && <a href={`tel:${drv.phone}`} className="text-xs text-primary">{drv.phone}</a>}
                    <div className="text-[11px] text-text-muted">{jobsFor(drv.id)} open job(s)</div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {formMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={formMode === 'pickup' ? 'Schedule pickup' : 'Schedule delivery'}>
          <Card className="w-full max-w-md space-y-4 p-5">
            <h2 className="text-base font-semibold">{formMode === 'pickup' ? 'Schedule a pickup' : 'Schedule a delivery'}</h2>
            <form onSubmit={(e) => void submitForm(e)} className="space-y-3">
              <div>
                <span className="mb-1 block text-xs font-semibold">{formMode === 'pickup' ? 'Customer phone or name' : 'Order number'}</span>
                <div className="flex gap-2">
                  <input className={fieldClass} value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder={formMode === 'pickup' ? '078…' : 'ORD-…'} />
                  <Button type="button" variant="secondary" onClick={() => void doLookup()} disabled={!lookup.trim()}>Find</Button>
                </div>
                {found && <p className="mt-1 text-xs text-emerald-700">{found.label}</p>}
              </div>
              {found && (
                <>
                  <label className="block text-xs font-semibold">Address
                    <input required className={fieldClass} value={address} onChange={(e) => setAddress(e.target.value)} />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs font-semibold">Date
                      <input required type="date" className={fieldClass} value={date} onChange={(e) => setDate(e.target.value)} />
                    </label>
                    <label className="block text-xs font-semibold">Time window
                      {timeSlots.length > 0 ? (
                        <select required className={fieldClass} value={slot} onChange={(e) => setSlot(e.target.value)}>
                          {timeSlots.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <input className={fieldClass} placeholder="e.g. 14:00-16:00" value={slot} onChange={(e) => setSlot(e.target.value)} />
                      )}
                    </label>
                  </div>
                  <label className="block text-xs font-semibold">Driver (optional)
                    <select className={fieldClass} value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                      <option value="">Assign later</option>
                      {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                    </select>
                  </label>
                </>
              )}
              {formError && <p className="text-xs text-rose-700">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setFormMode(null)}>Cancel</Button>
                <Button type="submit" disabled={saving || !found}>{saving ? 'Saving…' : 'Schedule'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
