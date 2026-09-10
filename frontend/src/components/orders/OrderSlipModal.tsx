import type { Order } from '../../types/order';
import { Button } from '../ui/Button';

interface OrderSlipModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderSlipModal({ order, isOpen, onClose }: OrderSlipModalProps) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl text-slate-800 font-sans print:shadow-none print:p-0 print:max-w-full">
        {/* Close Button for screen */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 print:hidden"
        >
          ✕
        </button>

        {/* Receipt Content Container */}
        <div className="border border-dashed border-slate-300 p-5 rounded bg-slate-50/50 print:border-none print:bg-white print:p-0">
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              EBENEZER DRY CLEANER
            </h2>
            <p className="text-xs text-slate-500">Nyamata, Bugesera, Rwanda</p>
            <p className="text-xs text-slate-500">Tel: +250 788 000 000</p>
            <div className="mt-2 inline-block rounded border border-slate-900 px-3 py-1 text-xs font-mono font-bold tracking-wider">
              ORDER SLIP #{order.orderNumber}
            </div>
          </div>

          {/* Customer & Storage Identifiers */}
          <div className="py-3 text-xs border-b border-dashed border-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-semibold text-slate-900">{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Phone:</span>
              <span className="font-medium text-slate-800">{order.customerPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date Received:</span>
              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Service Priority:</span>
              <span className="font-bold text-emerald-700">{order.serviceTier}</span>
            </div>
          </div>

          {/* Storage Identifiers Box */}
          <div className="my-3 rounded bg-amber-50 border border-amber-200 p-2 text-xs text-amber-900 font-mono flex justify-around text-center">
            <div>
              <span className="block text-[10px] uppercase text-amber-700 font-sans">Cover ID</span>
              <span className="font-bold">{order.coverCode || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-amber-700 font-sans">Bag ID</span>
              <span className="font-bold">{order.bagCode || 'N/A'}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-amber-700 font-sans">Hangers</span>
              <span className="font-bold">{order.hangersCount}</span>
            </div>
          </div>

          {/* Itemized Garments */}
          <div className="py-2 text-xs border-b border-dashed border-slate-300">
            <p className="font-semibold text-slate-700 mb-1.5 uppercase text-[11px] tracking-wider">
              Garments Intake ({order.items.reduce((acc, i) => acc + i.quantity, 0)} items)
            </p>
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-[10px] border-b border-slate-200">
                  <th className="pb-1 font-medium">Item</th>
                  <th className="pb-1 text-center font-medium">Qty</th>
                  <th className="pb-1 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-1 font-medium text-slate-800">{item.garmentName}</td>
                    <td className="py-1 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-1 text-right font-mono">{item.totalPrice.toLocaleString()} RWF</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Materials if any */}
          {order.materials.length > 0 && (
            <div className="py-2 text-xs border-b border-dashed border-slate-300">
              <p className="font-semibold text-slate-700 mb-1 uppercase text-[10px] tracking-wider">
                Packaging Materials
              </p>
              {order.materials.map((m) => (
                <div key={m.id} className="flex justify-between text-[11px] text-slate-600">
                  <span>
                    {m.name} (x{m.quantity})
                  </span>
                  <span className="font-mono">
                    {m.customerProvided ? 'Client Provided (0)' : `${m.totalPrice.toLocaleString()} RWF`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="py-3 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">{order.subtotal.toLocaleString()} RWF</span>
            </div>
            {order.priorityFee > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Priority Charge:</span>
                <span className="font-mono">+{order.priorityFee.toLocaleString()} RWF</span>
              </div>
            )}
            {order.materialCharges > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Materials Charge:</span>
                <span className="font-mono">+{order.materialCharges.toLocaleString()} RWF</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span className="font-mono">-{order.discount.toLocaleString()} RWF</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
              <span>TOTAL AMOUNT:</span>
              <span className="font-mono">{order.totalAmount.toLocaleString()} RWF</span>
            </div>
            <div className="flex justify-between text-slate-700 font-medium">
              <span>Amount Paid:</span>
              <span className="font-mono text-emerald-700">{order.amountPaid.toLocaleString()} RWF</span>
            </div>
            <div className="flex justify-between font-bold text-amber-800 pt-1">
              <span>BALANCE DUE:</span>
              <span className="font-mono">{order.balanceDue.toLocaleString()} RWF</span>
            </div>
          </div>

          {/* Ready Due Date Notice */}
          <div className="mt-2 rounded bg-slate-100 p-2 text-center text-xs text-slate-700 border border-slate-200">
            <p className="text-[10px] text-slate-500 font-medium uppercase">Expected Ready Date & Time</p>
            <p className="font-bold text-slate-900">
              {new Date(order.expectedCompletion).toLocaleString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          {/* QR Code Placeholder Box */}
          <div className="mt-4 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded border-2 border-slate-800 p-1 flex items-center justify-center bg-white">
              <span className="font-mono text-[9px] font-bold tracking-tight text-slate-800">
                [ QR CODE ]
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Scan to verify garment intake</p>
          </div>

          {/* Footer note */}
          <div className="mt-3 text-center text-[10px] text-slate-400 border-t border-dashed border-slate-300 pt-2">
            Thank you for choosing EBENEZER Dry Cleaner!
            <br />
            Please bring this paper when collecting your items.
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="mt-4 flex justify-end gap-2 print:hidden">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint}>🖨️ Print Slip</Button>
        </div>
      </div>
    </div>
  );
}
