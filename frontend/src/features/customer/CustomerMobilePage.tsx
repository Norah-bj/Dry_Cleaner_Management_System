import { useState } from 'react';
import { CheckCircle, MessageCircle, Package, Phone, Search, Shirt, Loader2 } from 'lucide-react';
import { ApiError } from '../../lib/api-client';
import { trackOrder } from '../../services/orders';
import { requestPickup } from '../../services/logistics';

/**
 * Customer Mobile Web — /customer
 * Minimal public-facing page for EBENEZER customers:
 * - Track their order by order number
 * - Request a pickup (form)
 * - WhatsApp click-to-chat
 * No auth required. Phone-first layout.
 */

const BUSINESS_PHONE = '0788000000';
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

const STAGE_ORDER = [
  'RECEIVED',
  'SORTING',
  'WASHING',
  'DRYING',
  'IRONING',
  'QUALITY_CHECK',
  'PACKING',
  'READY',
  'DELIVERED',
];

function getProgress(stage: string) {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx === -1 ? 0 : Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
}

// ── Order Tracker ─────────────────────────────────────────────────────────────
function OrderTracker() {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    setError(null);

    try {
      const res = await trackOrder(query.trim().toUpperCase());
      if (res) {
        setOrder({
          orderNumber: res.orderNumber,
          customerName: res.customer?.name ?? 'Customer',
          currentStage: res.status,
          expectedCompletion: res.expectedCompletion,
          totalAmount: Number(res.total),
          amountPaid: Number(res.amountPaid),
          balanceDue: Number(res.balance),
          paymentStatus: res.paymentStatus,
          items: res.items,
        });
      } else {
        setOrder(null);
      }
    } catch (err) {
      setOrder(null);
      // 404 = no such order (shown below as "not found"); anything else is a real failure.
      if (!(err instanceof ApiError && err.status === 404)) {
        setError("We couldn't check your order right now. Please try again in a moment, or contact us.");
      }
    } finally {
      setLoading(false);
    }
  }

  const progress = order ? getProgress(order.currentStage) : 0;
  const isReady = order?.currentStage === 'READY' || order?.currentStage === 'DELIVERED';

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearched(false);
            }}
            placeholder="Order number e.g. ORD-2026-00001"
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Track'}
        </button>
      </form>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-800">
          {error}
        </div>
      )}

      {searched && !order && !loading && !error && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
          <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          Order <strong>{query.toUpperCase()}</strong> not found.<br />
          Check the number on your receipt, or contact us.
        </div>
      )}

      {order && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
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

          <div>
            <div className="mb-1.5 flex justify-between text-xs text-slate-500">
              <span>The Clean Journey</span>
              <span className="font-bold text-emerald-600">{STAGE_LABELS[order.currentStage] || order.currentStage}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
            <div>
              <span className="text-slate-400 block">Balance Owed:</span>
              <span className={`font-mono font-bold ${order.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {order.balanceDue > 0 ? `${order.balanceDue.toLocaleString()} RWF` : 'Paid in Full ✓'}
              </span>
            </div>
            {order.expectedCompletion && (
              <div>
                <span className="text-slate-400 block">Ready by:</span>
                <span className="font-semibold text-slate-700">
                  {new Date(order.expectedCompletion).toLocaleDateString([], {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pickup Request Form ───────────────────────────────────────────────────────
function PickupForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('Morning (08:00 - 12:00)');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !phone || !address) return;

    setLoading(true);

    setSubmitError(null);
    try {
      await requestPickup({ name, phone, address, scheduledDate: date, timeSlot, notes: notes || undefined });
      setSubmitted(true);
    } catch {
      setSubmitError("We couldn't send your request. Please try again, or call or WhatsApp us.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
        <CheckCircle className="mx-auto h-10 w-10 text-emerald-600" />
        <h3 className="font-bold text-emerald-800">Pickup Request Received!</h3>
        <p className="text-xs text-emerald-700">
          Our driver will contact you at <strong>{phone}</strong> before arriving on{' '}
          <strong>{new Date(date).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}</strong>.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-2 text-xs font-semibold text-emerald-700 underline"
        >
          Request another pickup
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name *</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Marie Claire"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (MTN / Airtel) *</label>
        <input
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0788 123 456"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Pickup Address (Nyamata & Bugesera) *</label>
        <input
          type="text"
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. Nyamata City Center, Near Hospital"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
          <select
            value={timeSlot}
            onChange={(e) => setTimeSlot(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
          >
            <option>Morning (08:00 - 12:00)</option>
            <option>Afternoon (13:00 - 17:00)</option>
            <option>Evening (17:00 - 19:00)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Garment Types</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. 3 suits and 2 dresses, please bring bags"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {submitError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs text-rose-800">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Request Pickup'}
      </button>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function CustomerMobilePage() {
  const [activeTab, setActiveTab] = useState<'track' | 'pickup'>('track');

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Brand Header */}
      <div className="bg-emerald-700 px-4 pt-8 pb-6 text-white text-center">
        <div className="flex justify-center mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Shirt className="h-6 w-6 text-white" />
          </div>
        </div>
        <h1 className="text-xl font-bold">EBENEZER Dry Cleaner</h1>
        <p className="text-xs text-emerald-100 mt-1">Professional Laundry & Dry Cleaning • Nyamata</p>

        {/* Tab switch */}
        <div className="mt-5 grid grid-cols-2 rounded-xl bg-emerald-900/40 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('track')}
            className={`rounded-lg py-2 transition-all ${
              activeTab === 'track' ? 'bg-white text-emerald-800 shadow' : 'text-emerald-200 hover:text-white'
            }`}
          >
            Track Order
          </button>
          <button
            onClick={() => setActiveTab('pickup')}
            className={`rounded-lg py-2 transition-all ${
              activeTab === 'pickup' ? 'bg-white text-emerald-800 shadow' : 'text-emerald-200 hover:text-white'
            }`}
          >
            Request Pickup
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 max-w-md mx-auto">
        {activeTab === 'track' && <OrderTracker />}
        {activeTab === 'pickup' && <PickupForm />}

        {/* Direct Contact CTAs */}
        <div className="mt-8 border-t border-slate-200 pt-6 space-y-2.5 text-center">
          <div className="text-xs text-slate-500 font-medium">Need immediate assistance?</div>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:${BUSINESS_PHONE}`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Phone className="h-3.5 w-3.5 text-emerald-600" /> Call Shop
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#20bd5a]"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
