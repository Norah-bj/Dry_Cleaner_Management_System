import { useEffect, useState } from 'react';
import type { Order } from '../../types/order';
import { getSettings } from '../../services/settings';
import { TIER_LABELS, type ApiServiceTier, type BusinessSettings } from '../../types/settings';
import { Button } from '../ui/Button';

interface OrderSlipModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  /** Print a receipt for one payment instead of the full order slip. */
  paymentId?: string | null;
}

const tierLabel = (t: string) => TIER_LABELS[(t === 'NORMAL' ? 'STANDARD' : t) as ApiServiceTier] ?? t;
const rwf = (n: number) => `${n.toLocaleString()} RWF`;
const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * The paper the customer keeps (business rule #9, PAGES.md §21): customer
 * number, name, phone, items, expected date, total, paid and balance, plus
 * the storage IDs staff use to find the order. Shop details come from
 * Settings. EDCMS receipts are not EBM tax receipts (the EBM module is not
 * connected), and the slip says so.
 */
export function OrderSlipModal({ order, isOpen, onClose, paymentId = null }: OrderSlipModalProps) {
  const [shop, setShop] = useState<BusinessSettings | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    getSettings()
      .then(setShop)
      .catch(() => setShop(null)); // Prints without contact line if Settings can't load.
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const payment = paymentId ? order.payments.find((p) => p.id === paymentId) : null;
  const itemCount = order.items.reduce((acc, i) => acc + i.quantity, 0);
  const contact = [shop?.phone && `Tel ${shop.phone}`, shop?.tin && `TIN ${shop.tin}`].filter(Boolean).join(' · ');

  const Row = ({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) => (
    <div className={`flex justify-between gap-3 ${strong ? 'font-bold text-slate-900' : ''}`}>
      <span className="text-slate-500">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 print:static print:bg-white print:p-0" role="dialog" aria-modal="true" aria-label={payment ? 'Payment receipt' : 'Order slip'}>
      <div className="w-full max-w-sm rounded-lg bg-white p-5 font-sans text-slate-800 shadow-xl print:shadow-none">
        <div className="print-area print-receipt space-y-3 text-xs">
          <div className="border-b border-dashed border-slate-300 pb-3 text-center">
            <h2 className="text-base font-bold tracking-tight text-slate-900">{shop?.businessName ?? 'EBENEZER DRY CLEANER'}</h2>
            {shop?.address && <p className="text-slate-500">{shop.address}</p>}
            {contact && <p className="text-slate-500">{contact}</p>}
            <div className="mt-2 inline-block rounded border border-slate-900 px-3 py-1 font-mono font-bold tracking-wider">
              {payment ? `RECEIPT ${payment.receiptNumber}` : `ORDER ${order.orderNumber}`}
            </div>
          </div>

          <div className="space-y-1 border-b border-dashed border-slate-300 pb-3">
            {payment && <Row label="Order" value={<span className="font-mono">{order.orderNumber}</span>} />}
            {order.customerNumber && <Row label="Customer no." value={<span className="font-mono font-semibold">{order.customerNumber}</span>} />}
            <Row label="Customer" value={<span className="font-semibold">{order.customerName}</span>} />
            <Row label="Phone" value={order.customerPhone || '—'} />
            {payment ? (
              <Row label="Paid on" value={when(payment.receivedAt)} />
            ) : (
              <>
                <Row label="Received" value={when(order.createdAt)} />
                <Row label="Speed" value={<span className="font-semibold">{tierLabel(order.serviceTier)}</span>} />
              </>
            )}
          </div>

          {payment ? (
            <div className="space-y-1">
              <Row label="Amount paid" value={<span className="font-mono">{rwf(payment.amount)}</span>} strong />
              <Row label="Method" value={payment.method === 'MOBILE_MONEY' ? 'Mobile Money' : payment.method.replace('_', ' ').toLowerCase()} />
              {payment.reference && <Row label="Reference" value={payment.reference} />}
              <div className="mt-2 border-t border-slate-200 pt-2" />
              <Row label="Order total" value={<span className="font-mono">{rwf(order.totalAmount)}</span>} />
              <Row label="Paid so far" value={<span className="font-mono">{rwf(order.amountPaid)}</span>} />
              <Row label="Balance" value={<span className="font-mono">{order.balanceDue > 0 ? rwf(order.balanceDue) : 'Paid in full'}</span>} strong />
            </div>
          ) : (
            <>
              {(order.coverCode || order.bagCode) && (
                <div className="flex justify-around rounded border border-amber-200 bg-amber-50 p-2 text-center font-mono text-amber-900">
                  {order.coverCode && (<div><span className="block font-sans text-[10px] uppercase text-amber-700">Hanger / rack</span><span className="font-bold">{order.coverCode}</span></div>)}
                  {order.bagCode && (<div><span className="block font-sans text-[10px] uppercase text-amber-700">Bag / box</span><span className="font-bold">{order.bagCode}</span></div>)}
                </div>
              )}

              <div className="border-b border-dashed border-slate-300 pb-2">
                <p className="mb-1 font-semibold uppercase tracking-wider text-slate-700">Items ({itemCount})</p>
                <table className="w-full text-left">
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-0.5">{item.garmentName}</td>
                        <td className="py-0.5 text-center text-slate-600">×{item.quantity}</td>
                        <td className="py-0.5 text-right font-mono">{rwf(item.totalPrice)}</td>
                      </tr>
                    ))}
                    {order.materials.map((m) => (
                      <tr key={m.id} className="text-slate-600">
                        <td className="py-0.5">{m.name.charAt(0) + m.name.slice(1).toLowerCase()}</td>
                        <td className="py-0.5 text-center">×{m.quantity}</td>
                        <td className="py-0.5 text-right font-mono">{m.customerProvided ? 'own (0)' : rwf(m.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1">
                {order.discount > 0 && <Row label="Discount" value={<span className="font-mono">-{rwf(order.discount)}</span>} />}
                <Row label="TOTAL" value={<span className="font-mono">{rwf(order.totalAmount)}</span>} strong />
                <Row label="Paid" value={<span className="font-mono">{rwf(order.amountPaid)}</span>} />
                <Row label="BALANCE" value={<span className="font-mono">{order.balanceDue > 0 ? rwf(order.balanceDue) : 'Paid in full'}</span>} strong />
              </div>

              <div className="rounded border border-slate-200 bg-slate-100 p-2 text-center">
                <p className="text-[10px] font-medium uppercase text-slate-500">Ready by</p>
                <p className="font-bold text-slate-900">{order.expectedCompletion ? when(order.expectedCompletion) : 'We will call you when it is ready'}</p>
              </div>
            </>
          )}

          <div className="border-t border-dashed border-slate-300 pt-2 text-center text-[10px] text-slate-500">
            {!payment && <p>Bring this paper and your order number to collect your clothes.</p>}
            {shop?.receiptFooter && <p>{shop.receiptFooter}</p>}
            <p className="mt-1">This is not an EBM tax receipt.</p>
          </div>
        </div>

        <div className="no-print mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={() => window.print()}>Print</Button>
        </div>
      </div>
    </div>
  );
}
