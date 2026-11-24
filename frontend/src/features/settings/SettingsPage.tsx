import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Clock, DollarSign, Plus, Users, Wallet } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadError } from '../../components/ui/LoadError';
import { PageHeader } from '../../components/ui/PageHeader';
import { cn } from '../../lib/cn';
import { errorMessage } from '../../lib/error-message';
import {
  createServiceItem,
  getSettings,
  listServiceItems,
  updateServiceItem,
  updateSettings,
} from '../../services/settings';
import { ROLE_LABELS, type UserRole } from '../../types/auth';
import {
  DAY_NAMES,
  MATERIAL_LABELS,
  PAYMENT_METHOD_LABELS,
  TIER_LABELS,
  type ApiPaymentMethod,
  type ApiServiceTier,
  type BusinessSettings,
  type MaterialType,
  type OpeningHoursDay,
  type ServiceItem,
} from '../../types/settings';

/**
 * Everything the owner controls - prices, payment methods, charges, hours,
 * time windows, discount policy - is entered here and stored in the
 * database. Nothing is pre-filled with guessed numbers.
 */
type Section = 'BUSINESS' | 'PRICING' | 'PAYMENTS' | 'HOURS';

const NAV_ITEMS: { id: Section; icon: React.ElementType; label: string; description: string }[] = [
  { id: 'BUSINESS', icon: Building2, label: 'Business Details', description: 'Name, phone, WhatsApp, address' },
  { id: 'PRICING', icon: DollarSign, label: 'Services & Prices', description: 'Your price list per speed' },
  { id: 'PAYMENTS', icon: Wallet, label: 'Payments & Charges', description: 'Methods, materials, discounts' },
  { id: 'HOURS', icon: Clock, label: 'Hours & Time Windows', description: 'Opening hours, pickup windows' },
];

const TIERS: ApiServiceTier[] = ['STANDARD', 'EXPRESS', 'SAME_DAY'];
const METHODS: ApiPaymentMethod[] = ['CASH', 'MOMO', 'BANK_TRANSFER', 'CARD'];
const MATERIALS: MaterialType[] = ['BAG', 'COVER', 'HANGER', 'ENVELOPE'];
const STAFF_ROLES: UserRole[] = ['manager', 'receptionist', 'cashier', 'laundry_staff', 'driver'];

const fieldClass =
  'w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none';

/** "" -> null, otherwise a number (for optional price inputs). */
function toPrice(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function SaveBar({ saving, message, error, onSave }: { saving: boolean; message: string | null; error: string | null; onSave: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <Button size="sm" onClick={onSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
      {message && <span className="text-xs text-emerald-700">{message}</span>}
      {error && <span className="text-xs text-rose-700">{error}</span>}
    </div>
  );
}

function useSave(onSaved: (s: BusinessSettings) => void) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = async (input: Partial<BusinessSettings>) => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      onSaved(await updateSettings(input));
      setMessage('Saved.');
    } catch (err) {
      setError(errorMessage(err, 'save these settings'));
    } finally {
      setSaving(false);
    }
  };
  return { saving, message, error, save };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-text">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-text-muted">{hint}</span>}
    </label>
  );
}

// ── Business details ─────────────────────────────────────────────────────────
function BusinessSection({ settings, onSaved }: { settings: BusinessSettings; onSaved: (s: BusinessSettings) => void }) {
  const [form, setForm] = useState({
    businessName: settings.businessName,
    ownerName: settings.ownerName ?? '',
    phone: settings.phone ?? '',
    whatsappNumber: settings.whatsappNumber ?? '',
    email: settings.email ?? '',
    address: settings.address ?? '',
    tin: settings.tin ?? '',
    receiptFooter: settings.receiptFooter ?? '',
  });
  const { saving, message, error, save } = useSave(onSaved);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

  return (
    <Card className="space-y-4 p-5">
      <h2 className="text-base font-semibold text-text">Business Details</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Business name"><input className={fieldClass} value={form.businessName} onChange={set('businessName')} /></Field>
        <Field label="Owner"><input className={fieldClass} value={form.ownerName} onChange={set('ownerName')} /></Field>
        <Field label="Shop phone" hint="Shown to customers on the customer page."><input className={fieldClass} value={form.phone} onChange={set('phone')} placeholder="07…" /></Field>
        <Field label="WhatsApp number" hint="Customers' WhatsApp button opens a chat with this number."><input className={fieldClass} value={form.whatsappNumber} onChange={set('whatsappNumber')} placeholder="07…" /></Field>
        <Field label="Email"><input className={fieldClass} type="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="TIN"><input className={fieldClass} value={form.tin} onChange={set('tin')} /></Field>
        <div className="sm:col-span-2"><Field label="Address"><input className={fieldClass} value={form.address} onChange={set('address')} /></Field></div>
        <div className="sm:col-span-2"><Field label="Note printed at the bottom of receipts (optional)"><input className={fieldClass} value={form.receiptFooter} onChange={set('receiptFooter')} /></Field></div>
      </div>
      <SaveBar
        saving={saving}
        message={message}
        error={error}
        onSave={() =>
          void save({
            businessName: form.businessName.trim(),
            ownerName: orNull(form.ownerName),
            phone: orNull(form.phone),
            whatsappNumber: orNull(form.whatsappNumber),
            email: orNull(form.email),
            address: orNull(form.address),
            tin: orNull(form.tin),
            receiptFooter: orNull(form.receiptFooter),
          })
        }
      />
    </Card>
  );
}

// ── Services & prices ────────────────────────────────────────────────────────
interface ItemDraft {
  name: string;
  category: string;
  priceStandard: string;
  priceExpress: string;
  priceSameDay: string;
}

const emptyDraft: ItemDraft = { name: '', category: '', priceStandard: '', priceExpress: '', priceSameDay: '' };

function toDraft(item: ServiceItem): ItemDraft {
  const s = (v: number | null) => (v === null ? '' : String(v));
  return {
    name: item.name,
    category: item.category ?? '',
    priceStandard: s(item.priceStandard),
    priceExpress: s(item.priceExpress),
    priceSameDay: s(item.priceSameDay),
  };
}

function fromDraft(d: ItemDraft) {
  return {
    name: d.name.trim(),
    category: d.category.trim() || null,
    priceStandard: toPrice(d.priceStandard),
    priceExpress: toPrice(d.priceExpress),
    priceSameDay: toPrice(d.priceSameDay),
  };
}

function PricingSection() {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ItemDraft>(emptyDraft);
  const [newItem, setNewItem] = useState<ItemDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listServiceItems(true));
    } catch (err) {
      setError(errorMessage(err, 'load the price list'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<unknown>, what: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
      return true;
    } catch (err) {
      setError(errorMessage(err, what));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const priceInputs = (d: ItemDraft, onChange: (d: ItemDraft) => void) =>
    TIERS.map((tier) => {
      const key = tier === 'STANDARD' ? 'priceStandard' : tier === 'EXPRESS' ? 'priceExpress' : 'priceSameDay';
      return (
        <td key={tier} className="px-2 py-2">
          <input
            type="number"
            min="0"
            inputMode="numeric"
            aria-label={`${TIER_LABELS[tier]} price`}
            placeholder="—"
            value={d[key]}
            onChange={(e) => onChange({ ...d, [key]: e.target.value })}
            className="w-24 rounded border border-border bg-surface px-2 py-1 text-right font-mono text-xs focus:border-primary focus:outline-none"
          />
        </td>
      );
    });

  const money = (v: number | null) =>
    v === null ? <span className="text-text-muted">—</span> : <span className="font-mono">{v.toLocaleString()}</span>;

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-base font-semibold text-text">Services & Prices</h2>
        <p className="text-xs text-text-muted">
          Prices in RWF. Leave a speed empty if you don't offer it for that item. Changing a price
          affects new orders only; past orders keep the price they were charged.
        </p>
      </div>

      {error && <LoadError message={error} onRetry={() => void load()} />}

      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-border/20 text-[11px] font-medium uppercase tracking-wider text-text-muted">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Category</th>
              {TIERS.map((t) => (
                <th key={t} className="px-3 py-2 text-right">{TIER_LABELS[t]}</th>
              ))}
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && items.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-4 text-center text-text-muted">Loading…</td></tr>
            )}
            {!loading && items.length === 0 && !error && (
              <tr><td colSpan={6} className="px-3 py-4 text-center text-text-muted">No services yet. Add your first one below.</td></tr>
            )}
            {items.map((item) =>
              editingId === item.id ? (
                <tr key={item.id} className="bg-primary-light/20">
                  <td className="px-2 py-2"><input className={fieldClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></td>
                  <td className="px-2 py-2"><input className={fieldClass} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></td>
                  {priceInputs(draft, setDraft)}
                  <td className="space-x-2 whitespace-nowrap px-2 py-2">
                    <Button size="sm" disabled={busy || !draft.name.trim()} onClick={() => void run(() => updateServiceItem(item.id, fromDraft(draft)), 'save this item').then((ok) => ok && setEditingId(null))}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                  </td>
                </tr>
              ) : (
                <tr key={item.id} className={cn(!item.isActive && 'opacity-50')}>
                  <td className="px-3 py-2 font-medium text-text">
                    {item.name}
                    {!item.isActive && <span className="ml-2 text-[10px] uppercase text-text-muted">hidden</span>}
                  </td>
                  <td className="px-3 py-2 text-text-muted">{item.category ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{money(item.priceStandard)}</td>
                  <td className="px-3 py-2 text-right">{money(item.priceExpress)}</td>
                  <td className="px-3 py-2 text-right">{money(item.priceSameDay)}</td>
                  <td className="space-x-3 whitespace-nowrap px-3 py-2 text-right">
                    <button type="button" className="text-primary hover:underline" onClick={() => { setEditingId(item.id); setDraft(toDraft(item)); }}>Edit</button>
                    <button
                      type="button"
                      className="text-text-muted hover:underline"
                      disabled={busy}
                      onClick={() => void run(() => updateServiceItem(item.id, { isActive: !item.isActive }), 'update this item')}
                    >
                      {item.isActive ? 'Hide' : 'Show'}
                    </button>
                  </td>
                </tr>
              ),
            )}
            <tr className="bg-border/10">
              <td className="px-2 py-2"><input className={fieldClass} placeholder="New item, e.g. Shirt" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} /></td>
              <td className="px-2 py-2"><input className={fieldClass} placeholder="Optional" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} /></td>
              {priceInputs(newItem, setNewItem)}
              <td className="px-2 py-2">
                <Button
                  size="sm"
                  disabled={busy || !newItem.name.trim()}
                  onClick={() => void run(() => createServiceItem(fromDraft(newItem)), 'add this item').then((ok) => ok && setNewItem(emptyDraft))}
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-text-muted">
        "Hide" removes an item from new orders but keeps it on past orders. Items are never deleted.
      </p>
    </Card>
  );
}

// ── Payments & charges ───────────────────────────────────────────────────────
function PaymentsSection({ settings, onSaved }: { settings: BusinessSettings; onSaved: (s: BusinessSettings) => void }) {
  const [methods, setMethods] = useState<ApiPaymentMethod[]>(settings.enabledPaymentMethods);
  const [charges, setCharges] = useState<Record<MaterialType, string>>(() =>
    Object.fromEntries(MATERIALS.map((m) => [m, settings.materialCharges[m] === undefined ? '' : String(settings.materialCharges[m])])) as Record<MaterialType, string>,
  );
  const [allowDiscounts, setAllowDiscounts] = useState(settings.allowDiscounts);
  const [discountRoles, setDiscountRoles] = useState<UserRole[]>(settings.discountRoles);
  const { saving, message, error, save } = useSave(onSaved);

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <Card className="space-y-6 p-5">
      <h2 className="text-base font-semibold text-text">Payments & Charges</h2>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-text">Payment methods you accept</h3>
        <p className="mb-2 text-xs text-text-muted">Staff can only record payments with the methods ticked here.</p>
        <div className="flex flex-wrap gap-3">
          {METHODS.map((m) => (
            <label key={m} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <input type="checkbox" checked={methods.includes(m)} onChange={() => setMethods(toggle(methods, m))} />
              {PAYMENT_METHOD_LABELS[m]}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-text">Charge per material (RWF)</h3>
        <p className="mb-2 text-xs text-text-muted">
          Enter 0 if you don't charge for it. Leave empty if you don't use it; staff then can't add it to an order
          unless the customer brings their own.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MATERIALS.map((m) => (
            <Field key={m} label={MATERIAL_LABELS[m]}>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                className={fieldClass}
                placeholder="not set"
                value={charges[m]}
                onChange={(e) => setCharges({ ...charges, [m]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-text">Discounts</h3>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={allowDiscounts} onChange={(e) => setAllowDiscounts(e.target.checked)} />
          Allow discounts on orders
        </label>
        {allowDiscounts && (
          <div>
            <p className="mb-2 text-xs text-text-muted">Who may give a discount? (A Super Admin always can.)</p>
            <div className="flex flex-wrap gap-3">
              {STAFF_ROLES.filter((r) => r !== 'driver' && r !== 'laundry_staff').map((r) => (
                <label key={r} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <input type="checkbox" checked={discountRoles.includes(r)} onChange={() => setDiscountRoles(toggle(discountRoles, r))} />
                  {ROLE_LABELS[r]}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <SaveBar
        saving={saving}
        message={message}
        error={error}
        onSave={() =>
          void save({
            enabledPaymentMethods: methods,
            materialCharges: Object.fromEntries(
              MATERIALS.filter((m) => toPrice(charges[m]) !== null).map((m) => [m, toPrice(charges[m]) as number]),
            ),
            allowDiscounts,
            discountRoles,
          })
        }
      />
    </Card>
  );
}

// ── Hours & time windows ─────────────────────────────────────────────────────
function HoursSection({ settings, onSaved }: { settings: BusinessSettings; onSaved: (s: BusinessSettings) => void }) {
  const [hours, setHours] = useState<OpeningHoursDay[]>(() =>
    DAY_NAMES.map((_, day) => settings.openingHours.find((h) => h.day === day) ?? { day, closed: true }),
  );
  const [slots, setSlots] = useState<string[]>(settings.timeSlots);
  const [slotFrom, setSlotFrom] = useState('');
  const [slotTo, setSlotTo] = useState('');
  const [turnaround, setTurnaround] = useState<Record<ApiServiceTier, string>>({
    STANDARD: settings.turnaround.STANDARD ?? '',
    EXPRESS: settings.turnaround.EXPRESS ?? '',
    SAME_DAY: settings.turnaround.SAME_DAY ?? '',
  });
  const { saving, message, error, save } = useSave(onSaved);
  const [localError, setLocalError] = useState<string | null>(null);

  const updateDay = (day: number, patch: Partial<OpeningHoursDay>) =>
    setHours((h) => h.map((d) => (d.day === day ? { ...d, ...patch } : d)));

  const addSlot = () => {
    if (!slotFrom || !slotTo || slotFrom >= slotTo) {
      setLocalError('Pick a start time before the end time.');
      return;
    }
    const slot = `${slotFrom}-${slotTo}`;
    if (!slots.includes(slot)) setSlots([...slots, slot].sort());
    setSlotFrom('');
    setSlotTo('');
    setLocalError(null);
  };

  const onSave = () => {
    const bad = hours.find((d) => !d.closed && (!d.open || !d.close || d.open >= d.close));
    if (bad) {
      setLocalError(`Check ${DAY_NAMES[bad.day]}: set an opening time before the closing time, or mark it closed.`);
      return;
    }
    setLocalError(null);
    void save({
      openingHours: hours.map((d) => (d.closed ? { day: d.day, closed: true } : d)),
      timeSlots: slots,
      turnaround: Object.fromEntries(TIERS.filter((t) => turnaround[t].trim()).map((t) => [t, turnaround[t].trim()])),
    });
  };

  return (
    <Card className="space-y-6 p-5">
      <h2 className="text-base font-semibold text-text">Hours & Time Windows</h2>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-text">Opening hours</h3>
        <div className="space-y-2">
          {hours.map((d) => (
            <div key={d.day} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="w-24 font-medium">{DAY_NAMES[d.day]}</span>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={!d.closed} onChange={(e) => updateDay(d.day, { closed: !e.target.checked })} />
                Open
              </label>
              {!d.closed && (
                <>
                  <input type="time" aria-label={`${DAY_NAMES[d.day]} opens`} value={d.open ?? ''} onChange={(e) => updateDay(d.day, { open: e.target.value })} className="rounded border border-border px-2 py-1 text-xs" />
                  <span className="text-xs text-text-muted">to</span>
                  <input type="time" aria-label={`${DAY_NAMES[d.day]} closes`} value={d.close ?? ''} onChange={(e) => updateDay(d.day, { close: e.target.value })} className="rounded border border-border px-2 py-1 text-xs" />
                </>
              )}
              {d.closed && <span className="text-xs text-text-muted">Closed</span>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-text">Pickup & delivery time windows</h3>
        <p className="mb-2 text-xs text-text-muted">Customers and staff choose one of these windows for every pickup and delivery.</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {slots.length === 0 && <span className="text-xs text-text-muted">No windows yet.</span>}
          {slots.map((s) => (
            <span key={s} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
              {s}
              <button type="button" aria-label={`Remove ${s}`} className="text-rose-600" onClick={() => setSlots(slots.filter((x) => x !== s))}>×</button>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="time" aria-label="Window starts" value={slotFrom} onChange={(e) => setSlotFrom(e.target.value)} className="rounded border border-border px-2 py-1 text-xs" />
          <span className="text-xs text-text-muted">to</span>
          <input type="time" aria-label="Window ends" value={slotTo} onChange={(e) => setSlotTo(e.target.value)} className="rounded border border-border px-2 py-1 text-xs" />
          <Button size="sm" variant="secondary" onClick={addSlot}><Plus className="h-3.5 w-3.5" /> Add window</Button>
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-text">How long each speed takes</h3>
        <p className="mb-2 text-xs text-text-muted">Shown to staff at intake and to customers. Write it the way you'd say it, e.g. "3 days".</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TIERS.map((t) => (
            <Field key={t} label={TIER_LABELS[t]}>
              <Input value={turnaround[t]} onChange={(e) => setTurnaround({ ...turnaround, [t]: e.target.value })} />
            </Field>
          ))}
        </div>
      </div>

      {localError && <p className="text-xs text-rose-700">{localError}</p>}
      <SaveBar saving={saving} message={message} error={error} onSave={onSave} />
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function SettingsPage() {
  const [active, setActive] = useState<Section>('BUSINESS');
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSettings(await getSettings());
    } catch (err) {
      setError(errorMessage(err, 'load settings'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your prices, payment methods, hours and business details." />

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <div className="w-full shrink-0 space-y-1 lg:w-56">
          {NAV_ITEMS.map(({ id, icon: Icon, label, description }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={cn(
                'w-full rounded-lg px-3 py-2.5 text-left transition-colors',
                active === id ? 'bg-primary/10 text-primary' : 'text-text hover:bg-border/30',
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate text-sm font-medium">{label}</span>
                <ChevronRight className={cn('ml-auto h-3.5 w-3.5 shrink-0 transition-transform', active === id && 'rotate-90')} />
              </div>
              <div className="mt-0.5 truncate pl-6 text-[11px] text-text-muted">{description}</div>
            </button>
          ))}
          <Link to="/employees" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-text hover:bg-border/30">
            <Users className="h-4 w-4" /> Staff logins →
          </Link>
        </div>

        <div className="min-w-0 flex-1">
          {error && <LoadError message={error} onRetry={() => void load()} />}
          {!settings && !error && <p className="text-sm text-text-muted">Loading settings…</p>}
          {active === 'PRICING' && <PricingSection />}
          {settings && active === 'BUSINESS' && <BusinessSection settings={settings} onSaved={setSettings} />}
          {settings && active === 'PAYMENTS' && <PaymentsSection settings={settings} onSaved={setSettings} />}
          {settings && active === 'HOURS' && <HoursSection settings={settings} onSaved={setSettings} />}
        </div>
      </div>
    </div>
  );
}
