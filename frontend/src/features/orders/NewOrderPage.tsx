import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadError } from '../../components/ui/LoadError';
import { PageHeader } from '../../components/ui/PageHeader';
import { OrderSlipModal } from '../../components/orders/OrderSlipModal';
import { cn } from '../../lib/cn';
import { errorMessage } from '../../lib/error-message';
import { useAuth } from '../auth/use-auth';
import { createCustomer, listCustomers } from '../../services/customers';
import { createOrder as apiCreateOrder, getOrder } from '../../services/orders';
import { mapApiOrderToOrder } from '../../services/order-mapper';
import { recordOrderPayment } from '../../services/payments';
import { getSettings, listServiceItems } from '../../services/settings';
import type { Order } from '../../types/order';
import {
  MATERIAL_LABELS,
  PAYMENT_METHOD_LABELS,
  TIER_LABELS,
  priceForTier,
  type ApiPaymentMethod,
  type ApiServiceTier,
  type BusinessSettings,
  type MaterialType,
  type ServiceItem,
} from '../../types/settings';

interface Line {
  serviceItemId: string;
  quantity: number;
  notes: string;
}

interface MaterialLine {
  materialType: MaterialType;
  quantity: number;
  customerProvided: boolean;
}

const TIERS: ApiServiceTier[] = ['STANDARD', 'EXPRESS', 'SAME_DAY'];
const MATERIAL_TYPES = Object.keys(MATERIAL_LABELS) as MaterialType[];
const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none';

function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-text">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">{n}</span>
      {children}
    </h2>
  );
}

/**
 * Order intake. Prices, material charges, payment methods and the discount
 * policy all come from Settings. The totals shown here are a preview; the
 * server recalculates and its figures are what the slip shows.
 */
export function NewOrderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [catalog, setCatalog] = useState<ServiceItem[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const [tier, setTier] = useState<ApiServiceTier>('STANDARD');
  const [lines, setLines] = useState<Line[]>([]);
  const [pickId, setPickId] = useState('');
  const [materials, setMaterials] = useState<MaterialLine[]>([]);

  const [discount, setDiscount] = useState(0);
  const [payNow, setPayNow] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<ApiPaymentMethod | ''>('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isSlipOpen, setIsSlipOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listServiceItems(), getSettings()])
      .then(([items, s]) => {
        if (cancelled) return;
        setCatalog(items);
        setSettings(s);
        setPaymentMethod(s.enabledPaymentMethods[0] ?? '');
      })
      .catch((err: unknown) => {
        if (!cancelled) setSetupError(errorMessage(err, 'load the price list and settings'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);
  const anyMaterialCharged = MATERIAL_TYPES.some((m) => settings?.materialCharges[m] !== undefined);
  const canDiscount =
    !!settings?.allowDiscounts && (user?.role === 'super_admin' || (!!user && settings.discountRoles.includes(user.role)));

  // Preview totals (the server recalculates).
  const lineDetails = lines.map((l) => {
    const item = byId.get(l.serviceItemId);
    const unit = item ? priceForTier(item, tier) : null;
    return { ...l, item, unit, total: unit === null ? null : unit * l.quantity };
  });
  const unpriced = lineDetails.filter((l) => l.unit === null);
  const garmentsSubtotal = lineDetails.reduce((s, l) => s + (l.total ?? 0), 0);
  const materialsSubtotal = materials.reduce(
    (s, m) => s + (m.customerProvided ? 0 : (settings?.materialCharges[m.materialType] ?? 0) * m.quantity),
    0,
  );
  const totalAmount = Math.max(0, garmentsSubtotal + materialsSubtotal - (canDiscount ? discount : 0));

  const addLine = () => {
    if (!pickId) return;
    setLines((prev) => {
      const existing = prev.find((l) => l.serviceItemId === pickId);
      if (existing) return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { serviceItemId: pickId, quantity: 1, notes: '' }];
    });
  };

  const setLineQty = (idx: number, quantity: number) => {
    if (quantity >= 1) setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, quantity } : l)));
  };

  const toggleMaterial = (m: MaterialType) =>
    setMaterials((prev) =>
      prev.some((x) => x.materialType === m)
        ? prev.filter((x) => x.materialType !== m)
        : [...prev, { materialType: m, quantity: 1, customerProvided: settings?.materialCharges[m] === undefined }],
    );

  const updateMaterial = (m: MaterialType, patch: Partial<MaterialLine>) =>
    setMaterials((prev) => prev.map((x) => (x.materialType === m ? { ...x, ...patch } : x)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0 || unpriced.length > 0) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const phone = customerPhone.trim();
      const found = await listCustomers({ search: phone });
      const existing = found.data.find((c) => c.phone === phone);
      const customerId = existing
        ? existing.id
        : (await createCustomer({ name: customerName.trim(), phone, address: customerAddress.trim() || undefined })).id;

      const created = await apiCreateOrder({
        customerId,
        serviceTier: tier,
        discount: canDiscount && discount > 0 ? discount : undefined,
        notes: notes.trim() || undefined,
        items: lines.map((l) => ({ serviceItemId: l.serviceItemId, quantity: l.quantity, notes: l.notes.trim() || undefined })),
        materials: materials.map((m) => ({ materialType: m.materialType, quantity: m.quantity, customerProvided: m.customerProvided })),
      });

      if (payNow && paymentAmount > 0 && paymentMethod) {
        try {
          await recordOrderPayment(created.id, { amount: paymentAmount, paymentMethod, notes: 'Payment at intake' });
        } catch (err) {
          setSubmitError(
            `Order ${created.orderNumber} was saved, but the payment was not recorded: ${errorMessage(err, 'record the payment')} Record it from the order page.`,
          );
        }
      }

      setCreatedOrder(mapApiOrderToOrder(await getOrder(created.id)));
      setIsSlipOpen(true);
    } catch (err) {
      setSubmitError(errorMessage(err, 'save this order'));
    } finally {
      setSubmitting(false);
    }
  };

  const ready = !!settings && catalog.length > 0;
  const isManager = user?.role === 'super_admin' || user?.role === 'manager';

  return (
    <div>
      <div className="mb-2">
        <button type="button" onClick={() => navigate('/orders')} className="inline-flex items-center text-xs font-medium text-text-muted hover:text-text">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Orders
        </button>
      </div>

      <PageHeader title="New Order" description="Register the customer, their garments and packaging, then print the slip." />

      {setupError && <LoadError message={setupError} onRetry={() => window.location.reload()} />}

      {settings && catalog.length === 0 && (
        <Card className="mb-6 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          No services are on the price list yet, so orders can't be priced.{' '}
          {isManager ? (
            <Link to="/settings" className="font-semibold underline">Add your services and prices in Settings.</Link>
          ) : (
            'Ask the owner or a manager to add the price list in Settings.'
          )}
        </Card>
      )}

      {settings && ready && (
        <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="p-5">
              <StepTitle n={1}>Customer</StepTitle>
              <p className="mb-3 text-[11px] text-text-muted">An existing customer with this phone number is reused; otherwise a new customer is registered.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold">Name *
                  <input required className={inputClass} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </label>
                <label className="text-xs font-semibold">Phone *
                  <input required type="tel" className={inputClass} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </label>
                <label className="text-xs font-semibold sm:col-span-2">Address
                  <input className={inputClass} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                </label>
              </div>
            </Card>

            <Card className="p-5">
              <StepTitle n={2}>Speed</StepTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {TIERS.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTier(t)}
                    className={cn(
                      'rounded-lg border p-3.5 text-left transition-all',
                      tier === t ? 'border-primary bg-primary-light/50 ring-2 ring-primary/20' : 'border-border hover:border-primary/50',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{TIER_LABELS[t]}</span>
                      {tier === t && <CheckCircle className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="mt-1 text-[11px] text-text-muted">{settings.turnaround[t] || 'Turnaround not set'}</div>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <StepTitle n={3}>Garments</StepTitle>
              <div className="mb-4 flex gap-2">
                <select aria-label="Service" value={pickId} onChange={(e) => setPickId(e.target.value)} className={inputClass}>
                  <option value="">Choose an item…</option>
                  {catalog.map((c) => {
                    const p = priceForTier(c, tier);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} — {p === null ? `no ${TIER_LABELS[tier]} price` : `${p.toLocaleString()} RWF`}
                      </option>
                    );
                  })}
                </select>
                <Button type="button" variant="secondary" onClick={addLine} disabled={!pickId}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>

              {lines.length === 0 ? (
                <div className="rounded border border-dashed border-border p-4 text-center text-xs text-text-muted">No garments yet.</div>
              ) : (
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-border/20 text-[10px] font-medium uppercase text-text-muted">
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="w-24 px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Unit</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="w-10 px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {lineDetails.map((l, idx) => (
                        <tr key={l.serviceItemId} className={cn(l.unit === null && 'bg-rose-50')}>
                          <td className="px-3 py-2">
                            <div className="font-medium">{l.item?.name}</div>
                            <input
                              aria-label={`Notes for ${l.item?.name ?? 'item'}`}
                              placeholder="Notes (stains, damage…)"
                              value={l.notes}
                              onChange={(e) => setLines((prev) => prev.map((x, i) => (i === idx ? { ...x, notes: e.target.value } : x)))}
                              className="mt-1 w-full rounded border border-border px-2 py-0.5 text-[11px]"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button type="button" aria-label="Fewer" onClick={() => setLineQty(idx, l.quantity - 1)} className="h-5 w-5 rounded border border-border text-xs font-bold">-</button>
                              <span className="w-6 text-center font-bold">{l.quantity}</span>
                              <button type="button" aria-label="More" onClick={() => setLineQty(idx, l.quantity + 1)} className="h-5 w-5 rounded border border-border text-xs font-bold">+</button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {l.unit === null ? <span className="text-rose-700">no {TIER_LABELS[tier]} price</span> : l.unit.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold">{l.total === null ? '—' : l.total.toLocaleString()}</td>
                          <td className="px-3 py-2 text-center">
                            <button type="button" aria-label={`Remove ${l.item?.name ?? 'item'}`} onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))} className="text-rose-500 hover:text-rose-700">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {unpriced.length > 0 && (
                <p className="mt-2 text-xs text-rose-700">Some items have no {TIER_LABELS[tier]} price. Remove them or choose another speed.</p>
              )}
            </Card>

            <Card className="p-5">
              <StepTitle n={4}>Packaging</StepTitle>
              <div className="mb-3 flex flex-wrap gap-2">
                {MATERIAL_TYPES.map((m) => {
                  const charge = settings.materialCharges[m];
                  const selected = materials.some((x) => x.materialType === m);
                  return (
                    <Button key={m} type="button" size="sm" variant={selected ? 'secondary' : 'ghost'} onClick={() => toggleMaterial(m)}>
                      {selected ? '✓ ' : '+ '}
                      {MATERIAL_LABELS[m]} {charge === undefined ? "(customer's own only)" : `(${charge.toLocaleString()} RWF)`}
                    </Button>
                  );
                })}
              </div>
              <div className="space-y-2">
                {materials.map((m) => {
                  const mustBeOwn = settings.materialCharges[m.materialType] === undefined;
                  return (
                    <div key={m.materialType} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-border/10 p-2.5 text-xs">
                      <span className="font-medium">{MATERIAL_LABELS[m.materialType]}</span>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
                          <input
                            type="checkbox"
                            checked={m.customerProvided}
                            disabled={mustBeOwn}
                            onChange={(e) => updateMaterial(m.materialType, { customerProvided: e.target.checked })}
                          />
                          Customer brought their own (no charge)
                        </label>
                        <div className="flex items-center gap-1 font-mono">
                          <button type="button" aria-label="Fewer" onClick={() => m.quantity > 1 && updateMaterial(m.materialType, { quantity: m.quantity - 1 })} className="h-5 w-5 rounded border border-border text-xs font-bold">-</button>
                          <span className="w-5 text-center font-bold">{m.quantity}</span>
                          <button type="button" aria-label="More" onClick={() => updateMaterial(m.materialType, { quantity: m.quantity + 1 })} className="h-5 w-5 rounded border border-border text-xs font-bold">+</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!anyMaterialCharged && (
                <p className="mt-2 text-[11px] text-text-muted">No material charges are set in Settings, so only customer-supplied packaging can be recorded.</p>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-4 p-5">
              <h2 className="mb-4 border-b border-border pb-2 text-sm font-bold">Summary</h2>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-text-muted"><span>Garments ({TIER_LABELS[tier]})</span><span className="font-mono text-text">{garmentsSubtotal.toLocaleString()} RWF</span></div>
                <div className="flex justify-between text-text-muted"><span>Packaging</span><span className="font-mono text-text">{materialsSubtotal.toLocaleString()} RWF</span></div>
                {canDiscount && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-text-muted">Discount (RWF)</span>
                    <input
                      type="number"
                      min="0"
                      aria-label="Discount"
                      value={discount}
                      onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                      className="w-24 rounded border border-border px-2 py-1 text-right font-mono text-xs"
                    />
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-3 text-sm font-bold">
                  <span>Total</span>
                  <span className="font-mono text-base text-primary">{totalAmount.toLocaleString()} RWF</span>
                </div>
              </div>

              <div className="mt-5 border-t border-border pt-4">
                {settings.enabledPaymentMethods.length === 0 ? (
                  <p className="text-[11px] text-text-muted">No payment methods are enabled in Settings, so payment can't be taken at intake.</p>
                ) : (
                  <>
                    <label className="mb-3 flex items-center gap-2 text-xs font-semibold">
                      <input type="checkbox" checked={payNow} onChange={(e) => setPayNow(e.target.checked)} />
                      Take payment now (full or part)
                    </label>
                    {payNow && (
                      <div className="space-y-3 rounded-lg border border-border bg-border/10 p-3 text-xs">
                        <label className="block text-[11px] font-semibold">Amount (RWF)
                          <input type="number" min="1" max={totalAmount} value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} className={inputClass} />
                        </label>
                        <label className="block text-[11px] font-semibold">Method
                          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as ApiPaymentMethod)} className={inputClass}>
                            {settings.enabledPaymentMethods.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
                          </select>
                        </label>
                      </div>
                    )}
                  </>
                )}
              </div>

              <label className="mt-4 block text-xs font-semibold">Order notes
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded border border-border p-2 text-xs" />
              </label>

              {submitError && <div className="mt-4"><LoadError message={submitError} /></div>}

              <Button type="submit" size="lg" className="mt-5 w-full" disabled={submitting || lines.length === 0 || unpriced.length > 0}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : 'Save Order & Print Slip'}
              </Button>
            </Card>
          </div>
        </form>
      )}

      <OrderSlipModal
        isOpen={isSlipOpen}
        onClose={() => {
          setIsSlipOpen(false);
          navigate(createdOrder ? `/orders/${createdOrder.id}` : '/orders');
        }}
        order={createdOrder}
      />
    </div>
  );
}
