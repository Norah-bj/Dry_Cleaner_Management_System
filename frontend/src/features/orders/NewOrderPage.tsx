import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { OrderSlipModal } from '../../components/orders/OrderSlipModal';
import { MASTER_GARMENTS, MASTER_MATERIALS } from '../../mock/mock-data';
import { mockStore } from '../../mock/mock-store';
import { createCustomer, listCustomers } from '../../services/customers';
import { createOrder as apiCreateOrder } from '../../services/orders';
import { recordOrderPayment } from '../../services/payments';
import type { Order, PaymentMethod, ServiceTier } from '../../types/order';

interface SelectedGarment {
  garmentId: string;
  garmentName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

interface SelectedMaterial {
  materialId: string;
  materialName: string;
  quantity: number;
  unitPrice: number;
  customerProvided: boolean;
}

export function NewOrderPage() {
  const navigate = useNavigate();

  // Step 1: Customer
  const [customerName, setCustomerName] = useState('Jean Claude');
  const [customerPhone, setCustomerPhone] = useState('0788123456');
  const [customerAddress, setCustomerAddress] = useState('Nyamata Sector');

  // Step 2: Garments
  const [items, setItems] = useState<SelectedGarment[]>([
    { garmentId: 'g1', garmentName: 'Shirt / Blouse', quantity: 2, unitPrice: 2000 },
    { garmentId: 'g2', garmentName: 'Trouser / Pants', quantity: 1, unitPrice: 2500 },
  ]);
  const [selectedGarmentId, setSelectedGarmentId] = useState('g3');

  // Step 3: Priority Service Tier
  const [serviceTier, setServiceTier] = useState<ServiceTier>('EXPRESS');

  // Step 4: Packaging Materials
  const [materials, setMaterials] = useState<SelectedMaterial[]>([
    { materialId: 'm1', materialName: 'Garment Plastic Cover', quantity: 1, unitPrice: 300, customerProvided: false },
    { materialId: 'm2', materialName: 'Heavy Laundry Bag', quantity: 1, unitPrice: 500, customerProvided: false },
  ]);

  // Step 5: Payment & Notes
  const [discount, setDiscount] = useState(0);
  const [payNow, setPayNow] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState(5000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MOBILE_MONEY');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Slip modal after creation
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isSlipOpen, setIsSlipOpen] = useState(false);

  // Price Calculations
  const garmentsSubtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  let priorityFeeRatio = 0;
  if (serviceTier === 'EXPRESS') priorityFeeRatio = 0.5;
  if (serviceTier === 'SAME_DAY') priorityFeeRatio = 1.0;
  const priorityFee = Math.round(garmentsSubtotal * priorityFeeRatio);

  const materialsSubtotal = materials.reduce(
    (sum, mat) => sum + (mat.customerProvided ? 0 : mat.quantity * mat.unitPrice),
    0,
  );

  const totalAmount = Math.max(0, garmentsSubtotal + priorityFee + materialsSubtotal - discount);

  const handleAddGarment = () => {
    const catalogItem = MASTER_GARMENTS.find((g) => g.id === selectedGarmentId);
    if (!catalogItem) return;

    const existingIdx = items.findIndex((i) => i.garmentId === catalogItem.id);
    if (existingIdx !== -1) {
      const updated = [...items];
      updated[existingIdx].quantity += 1;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          garmentId: catalogItem.id,
          garmentName: catalogItem.name,
          quantity: 1,
          unitPrice: catalogItem.normalPrice,
        },
      ]);
    }
  };

  const handleRemoveGarment = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleUpdateGarmentQty = (idx: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = [...items];
    updated[idx].quantity = newQty;
    setItems(updated);
  };

  const handleToggleMaterialProvided = (idx: number) => {
    const updated = [...materials];
    updated[idx].customerProvided = !updated[idx].customerProvided;
    setMaterials(updated);
  };

  const handleUpdateMaterialQty = (idx: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = [...materials];
    updated[idx].quantity = newQty;
    setMaterials(updated);
  };

  const handleAddMaterial = (matId: string) => {
    const catalogMat = MASTER_MATERIALS.find((m) => m.id === matId);
    if (!catalogMat) return;
    if (materials.some((m) => m.materialId === matId)) return;

    setMaterials([
      ...materials,
      {
        materialId: catalogMat.id,
        materialName: catalogMat.name,
        quantity: 1,
        unitPrice: catalogMat.unitPrice,
        customerProvided: false,
      },
    ]);
  };

  const handleRemoveMaterial = (idx: number) => {
    setMaterials(materials.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      alert('Please fill in customer name and phone');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one garment');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Find or create customer in backend
      let customerId: string | undefined;
      try {
        const custSearch = await listCustomers({ search: customerPhone });
        const existingCust = custSearch.data.find(
          (c) => c.phone === customerPhone || c.name.toLowerCase() === customerName.toLowerCase(),
        );

        if (existingCust) {
          customerId = existingCust.id;
        } else {
          const newCust = await createCustomer({
            name: customerName,
            phone: customerPhone,
            address: customerAddress || undefined,
          });
          customerId = newCust.id;
        }
      } catch {
        // Customer module local fallback
      }

      // 2. Create order via Backend API if customer ID resolved
      let createdApiOrder: any = null;
      if (customerId) {
        try {
          const backendServiceTier =
            serviceTier === 'NORMAL' ? 'STANDARD' : serviceTier;

          createdApiOrder = await apiCreateOrder({
            customerId,
            serviceTier: backendServiceTier,
            discount,
            notes,
            items: items.map((i) => ({
              garmentName: i.garmentName,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              serviceTier: backendServiceTier,
            })),
            materials: materials.map((m) => ({
              materialType: m.materialName.includes('Cover')
                ? 'COVER'
                : m.materialName.includes('Bag')
                  ? 'BAG'
                  : m.materialName.includes('Hanger')
                    ? 'HANGER'
                    : 'ENVELOPE',
              quantity: m.quantity,
              customerProvided: m.customerProvided,
              unitCharge: m.unitPrice,
            })),
          });

          // If payment was made at intake
          if (payNow && paymentAmount > 0 && createdApiOrder?.id) {
            await recordOrderPayment(createdApiOrder.id, {
              amount: paymentAmount,
              paymentMethod: paymentMethod === 'MOBILE_MONEY' ? 'MOMO' : paymentMethod,
              notes: 'Initial intake payment',
            });
          }
        } catch {
          // Backend call failed, gracefully falling back to local store
        }
      }

      // Sync with local mock store for instant UI continuity
      const newOrder = mockStore.createOrder({
        customerId: customerId || 'cust-direct',
        customerName,
        customerPhone,
        customerAddress,
        serviceTier,
        items: items.map((i) => ({
          garmentName: i.garmentName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.quantity * i.unitPrice,
        })),
        materials: materials.map((m) => ({
          name: m.materialName,
          quantity: m.quantity,
          unitPrice: m.unitPrice,
          totalPrice: m.customerProvided ? 0 : m.quantity * m.unitPrice,
          customerProvided: m.customerProvided,
        })),
        discount,
        initialPayment: payNow && paymentAmount > 0 ? {
          amount: paymentAmount,
          method: paymentMethod,
        } : undefined,
        notes,
      });

      // Prefer backend order number if available
      if (createdApiOrder?.orderNumber) {
        newOrder.orderNumber = createdApiOrder.orderNumber;
        newOrder.id = createdApiOrder.id;
      }

      setCreatedOrder(newOrder);
      setIsSlipOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSlipClose = () => {
    setIsSlipOpen(false);
    if (createdOrder) {
      navigate(`/orders/${createdOrder.id}`);
    } else {
      navigate('/orders');
    }
  };

  return (
    <div>
      <div className="mb-2">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="inline-flex items-center text-xs font-medium text-text-muted hover:text-text"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Orders
        </button>
      </div>

      <PageHeader
        title="New Order Intake"
        description="Step-by-step customer order registration, garments inspection, packaging, and receipt generation."
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Wizard Steps */}
        <div className="space-y-6 lg:col-span-2">
          {/* Step 1: Customer Details */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                1
              </span>
              Customer Information
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Jean Claude"
                  className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Phone Number (MTN / Airtel) *
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0788 123 456"
                  className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-text mb-1">
                  Delivery / Home Address
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Nyamata Sector, Near Market"
                  className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </Card>

          {/* Step 2: Garment Items */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-text flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                  2
                </span>
                Garment Inspection & Intake
              </h2>
            </div>

            {/* Quick Add dropdown */}
            <div className="mb-4 flex gap-2">
              <select
                value={selectedGarmentId}
                onChange={(e) => setSelectedGarmentId(e.target.value)}
                className="flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
              >
                {MASTER_GARMENTS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} — {g.normalPrice.toLocaleString()} RWF ({g.category})
                  </option>
                ))}
              </select>
              <Button type="button" variant="secondary" onClick={handleAddGarment}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
              </Button>
            </div>

            {/* Selected Garments Table */}
            {items.length === 0 ? (
              <div className="rounded border border-dashed border-border/80 p-4 text-center text-xs text-text-muted">
                No garments added yet. Select garments above to build the order.
              </div>
            ) : (
              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-border/20 text-text-muted uppercase text-[10px] font-medium">
                    <tr>
                      <th className="px-3 py-2">Garment Item</th>
                      <th className="px-3 py-2 text-center w-20">Qty</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                      <th className="px-3 py-2 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item, idx) => (
                      <tr key={idx} className="bg-surface">
                        <td className="px-3 py-2 font-medium text-text">{item.garmentName}</td>
                        <td className="px-3 py-2 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateGarmentQty(idx, item.quantity - 1)}
                              className="h-5 w-5 rounded border border-border bg-border/20 text-xs font-bold hover:bg-border"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-bold text-xs">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateGarmentQty(idx, item.quantity + 1)}
                              className="h-5 w-5 rounded border border-border bg-border/20 text-xs font-bold hover:bg-border"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-text-muted">
                          {item.unitPrice.toLocaleString()} RWF
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-text">
                          {(item.quantity * item.unitPrice).toLocaleString()} RWF
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveGarment(idx)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Step 3: Service Priority Tier */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                3
              </span>
              Processing Priority Tier
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div
                onClick={() => setServiceTier('NORMAL')}
                className={`cursor-pointer rounded-lg border p-3.5 transition-all ${
                  serviceTier === 'NORMAL'
                    ? 'border-primary bg-primary-light/50 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-text">Standard</span>
                  {serviceTier === 'NORMAL' && <CheckCircle className="h-4 w-4 text-primary" />}
                </div>
                <div className="text-[11px] text-text-muted mt-1">2-3 days turnaround</div>
                <div className="mt-2 text-xs font-bold text-primary font-mono">Standard Tariff</div>
              </div>

              <div
                onClick={() => setServiceTier('EXPRESS')}
                className={`cursor-pointer rounded-lg border p-3.5 transition-all ${
                  serviceTier === 'EXPRESS'
                    ? 'border-primary bg-primary-light/50 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-700">⚡ Express (24h)</span>
                  {serviceTier === 'EXPRESS' && <CheckCircle className="h-4 w-4 text-primary" />}
                </div>
                <div className="text-[11px] text-text-muted mt-1">Next-day ready guaranteed</div>
                <div className="mt-2 text-xs font-bold text-amber-700 font-mono">+50% Priority Fee</div>
              </div>

              <div
                onClick={() => setServiceTier('SAME_DAY')}
                className={`cursor-pointer rounded-lg border p-3.5 transition-all ${
                  serviceTier === 'SAME_DAY'
                    ? 'border-primary bg-primary-light/50 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-rose-700">🔥 Same Day</span>
                  {serviceTier === 'SAME_DAY' && <CheckCircle className="h-4 w-4 text-primary" />}
                </div>
                <div className="text-[11px] text-text-muted mt-1">Ready in 6-8 hours</div>
                <div className="mt-2 text-xs font-bold text-rose-700 font-mono">+100% Priority Fee</div>
              </div>
            </div>
          </Card>

          {/* Step 4: Packaging & Materials */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-text flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                  4
                </span>
                Packaging & Delivery Materials
              </h2>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {MASTER_MATERIALS.map((mat) => {
                const isSelected = materials.some((m) => m.materialId === mat.id);
                return (
                  <Button
                    key={mat.id}
                    type="button"
                    variant={isSelected ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => handleAddMaterial(mat.id)}
                    disabled={isSelected}
                  >
                    + {mat.name} ({mat.unitPrice} RWF)
                  </Button>
                );
              })}
            </div>

            <div className="space-y-2">
              {materials.map((mat, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-md border border-border bg-border/10 p-2.5 text-xs"
                >
                  <div className="font-medium text-text">{mat.materialName}</div>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-text-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mat.customerProvided}
                        onChange={() => handleToggleMaterialProvided(idx)}
                        className="rounded border-border text-primary focus:ring-0"
                      />
                      Customer Provided (Free)
                    </label>

                    {!mat.customerProvided && (
                      <div className="flex items-center gap-1 font-mono">
                        <button
                          type="button"
                          onClick={() => handleUpdateMaterialQty(idx, mat.quantity - 1)}
                          className="h-5 w-5 rounded border border-border bg-surface text-xs font-bold"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold text-xs">{mat.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateMaterialQty(idx, mat.quantity + 1)}
                          className="h-5 w-5 rounded border border-border bg-surface text-xs font-bold"
                        >
                          +
                        </button>
                        <span className="ml-1 text-text font-bold">
                          {(mat.quantity * mat.unitPrice).toLocaleString()} RWF
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveMaterial(idx)}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Col: Bill Summary & Intake Confirmation */}
        <div className="space-y-6">
          <Card className="p-5 sticky top-4">
            <h2 className="text-sm font-bold text-text mb-4 border-b border-border pb-2">
              Order Pricing Summary
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-text-muted">
                <span>Garments Subtotal:</span>
                <span className="font-mono text-text">{garmentsSubtotal.toLocaleString()} RWF</span>
              </div>

              {priorityFee > 0 && (
                <div className="flex justify-between text-amber-700 font-medium">
                  <span>Priority Fee ({serviceTier}):</span>
                  <span className="font-mono">+{priorityFee.toLocaleString()} RWF</span>
                </div>
              )}

              <div className="flex justify-between text-text-muted">
                <span>Materials & Packaging:</span>
                <span className="font-mono text-text">{materialsSubtotal.toLocaleString()} RWF</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-text-muted">Discount (RWF):</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-24 rounded border border-border bg-surface px-2 py-1 text-right font-mono text-xs text-text focus:border-primary focus:outline-none"
                />
              </div>

              <div className="border-t border-border pt-3 flex justify-between text-sm font-bold text-text">
                <span>Total Amount:</span>
                <span className="font-mono text-primary text-base">
                  {totalAmount.toLocaleString()} RWF
                </span>
              </div>
            </div>

            {/* Payment Intake Section */}
            <div className="mt-5 border-t border-border pt-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-text cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={payNow}
                  onChange={(e) => setPayNow(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-0"
                />
                Accept Payment Now (Full or Partial)
              </label>

              {payNow && (
                <div className="space-y-3 rounded-lg border border-border bg-border/10 p-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">
                      Payment Amount (RWF)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={totalAmount}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="w-full rounded border border-border bg-surface px-3 py-1.5 font-mono text-xs text-text focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-text mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full rounded border border-border bg-surface px-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
                    >
                      <option value="MOBILE_MONEY">Mobile Money (MoMo)</option>
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CARD">Card POS</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-text mb-1">
                Internal Intake Notes / Stains
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Small ink mark on collar, customer requested double press"
                className="w-full rounded border border-border bg-surface p-2 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </div>

            {/* Submit CTA */}
            <Button
              type="submit"
              size="lg"
              className="mt-5 w-full text-center"
              disabled={submitting || items.length === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting Order...
                </>
              ) : (
                'Confirm Intake & Print Slip'
              )}
            </Button>
          </Card>
        </div>
      </form>

      {/* Slip Modal Popup */}
      <OrderSlipModal isOpen={isSlipOpen} onClose={handleSlipClose} order={createdOrder} />
    </div>
  );
}
