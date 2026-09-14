import { useState } from 'react';
import { CheckCircle, MessageCircle, Package, Phone, Search, Shirt, Truck } from 'lucide-react';
import { mockStore } from '../../mock/mock-store';

/**
 * Customer Mobile Web — /customer
 * Minimal public-facing page for EBENEZER customers:
 * - Track their order by order number
 * - Request a pickup (form)
 * - WhatsApp click-to-chat
 * No auth required. Intentionally simple — phone-first layout.
 */

const BUSINESS_PHONE = '0788000000'; // TODO: pull from settings API
const WHATSAPP_URL = `https://wa.me/250${BUSINESS_PHONE.slice(1)}?text=Hello%20EBENEZER%2C%20I%20have%20a%20question.`;

const STAGE_LABELS: Record<string, string> = {
  RECEIVED: 'Received',
  SORTING: 'Sorting',
  WASHING: 'Washing',
  DRYING: 'Drying',
  IRONING: 'Ironing',
  QUALITY_CHECK: 'Quality Check',
  PACKING: 'Packing',
  READY: 'Ready for Collection ✓',
  DELIVERED: 'Delivered ✓',
};

const STAGE_ORDER = ['RECEIVED', 'SORTING', 'WASHING', 'DRYING', 'IRONING', 'QUALITY_CHECK', 'PACKING', 'READY', 'DELIVERED'];

function getProgress(stage: string) {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx === -1 ? 0 : Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
}

// ── Order Tracker ─────────────────────────────────────────────────────────────
function OrderTracker() {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);

  const order = searched && query.trim()
    ? mockStore.getOrderById(query.trim().toUpperCase())
    : null;

  const progress = order ? getProgress(order.currentStage) : 0;
  const isReady = order?.currentStage === 'READY' || order?.currentStage === 'DELIVERED';

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearched(true);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearched(false); }}
            placeholder="Order number e.g. EC-001245"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 active:scale-95 transition-all"
        >
          Track
        </button>
      </form>

      {searched && !order && query && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
          <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          Order <strong>{query.toUpperCase()}</strong> not found.<br />
          Check the number on your receipt, or contact us.
        </div>
      )}

      {order && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs text-slate-400 font-mono">{order.orderNumber}</div>
              <div className="font-bold text-slate-800">{order.customerName}</div>
            </div>
            {isReady && (
              <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                <CheckCircle className="h-3.5 w-3.5" /> Ready
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div>
            <div className="mb-1.5 flex justify-between text-xs text-slate-500">
              <span>The Clean Journey</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Current stage */}
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
            <div className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Current stage</div>
            <div className="mt-1 text-base font-bold text-emerald-800">
              {STAGE_LABELS[order.currentStage] ?? order.currentStage}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400 mb-1">Items</div>
              <div className="font-semibold text-slate-700">
                {order.items.reduce((a, i) => a + i.quantity, 0)} garments
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-400 mb-1">Expected</div>
              <div className="font-semibold text-slate-700 text-xs">
                {new Date(order.expectedCompletion).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Balance due */}
          {order.balanceDue > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm">
              <span className="font-medium text-rose-800">Balance due on collection: </span>
              <span className="font-bold font-mono text-rose-700">{order.balanceDue.toLocaleString()} RWF</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pickup Request Form ───────────────────────────────────────────────────────
function PickupRequestForm() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', date: '', notes: '' });

  function handleChange(key: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // In mock mode: just show success
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-2">
        <CheckCircle className="mx-auto h-10 w-10 text-emerald-500" />
        <div className="font-bold text-emerald-800">Pickup Requested!</div>
        <div className="text-sm text-emerald-700">
          We'll contact you at <strong>{form.phone}</strong> to confirm your pickup time.
        </div>
        <button
          type="button"
          onClick={() => { setSubmitted(false); setForm({ name: '', phone: '', address: '', date: '', notes: '' }); }}
          className="mt-2 text-xs text-emerald-600 underline"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {[
        { key: 'name', label: 'Full name', type: 'text', placeholder: 'Your name', required: true },
        { key: 'phone', label: 'Phone number', type: 'tel', placeholder: '07XX XXX XXX', required: true },
        { key: 'address', label: 'Pickup address', type: 'text', placeholder: 'Where should we collect?', required: true },
        { key: 'date', label: 'Preferred date', type: 'date', placeholder: '', required: true },
      ].map(({ key, label, type, placeholder, required }) => (
        <div key={key}>
          <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
          <input
            type={type}
            required={required}
            placeholder={placeholder}
            value={form[key as keyof typeof form]}
            onChange={(e) => handleChange(key as keyof typeof form, e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      ))}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Notes (optional)</label>
        <textarea
          rows={2}
          placeholder="Special instructions, bag count, etc."
          value={form.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 active:scale-[0.98] transition-all"
      >
        Request Pickup
      </button>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type Tab = 'TRACK' | 'PICKUP';

export function CustomerMobilePage() {
  const [tab, setTab] = useState<Tab>('TRACK');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-emerald-700 px-4 pb-6 pt-8 text-white text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Shirt className="h-6 w-6" />
          <span className="text-lg font-bold tracking-tight">EBENEZER</span>
        </div>
        <div className="text-xs text-emerald-200">Dry Cleaner — Nyamata, Bugesera</div>

        {/* Hours */}
        <div className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-xs text-emerald-100 inline-block">
          Mon–Sat 7:00 – 19:00 &nbsp;·&nbsp; Sun 9:00 – 15:00
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-10 flex bg-white border-b border-slate-200 shadow-sm">
        {([
          { id: 'TRACK', icon: Search, label: 'Track Order' },
          { id: 'PICKUP', icon: Truck, label: 'Request Pickup' },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
              tab === id
                ? 'border-b-2 border-emerald-600 text-emerald-700'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mx-auto max-w-md px-4 py-6">
        {tab === 'TRACK' && <OrderTracker />}
        {tab === 'PICKUP' && <PickupRequestForm />}
      </div>

      {/* Bottom CTA */}
      <div className="mx-auto max-w-md px-4 pb-8 space-y-3">
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 text-sm font-bold text-white hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <MessageCircle className="h-5 w-5" /> Chat on WhatsApp
        </a>
        <a
          href={`tel:${BUSINESS_PHONE}`}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
        >
          <Phone className="h-4 w-4" /> Call {BUSINESS_PHONE}
        </a>
      </div>
    </div>
  );
}
