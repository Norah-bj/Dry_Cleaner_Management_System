import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { OrderSlipModal } from '../../components/orders/OrderSlipModal';
import { MASTER_GARMENTS, MASTER_MATERIALS } from '../../mock/mock-data';
import { mockStore } from '../../mock/mock-store';
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

  const handleUpdateGarmentQty = (idx: number, delta: number) => {
    const updated = [...items];
    const newQty = updated[idx].quantity + delta;
    if (newQty <= 0) {
      handleRemoveGarment(idx);
    } else {
      updated[idx].quantity = newQty;
      setItems(updated);
    }
  };

  const handleToggleMaterial = (matId: string) => {
    const catalogMat = MASTER_MATERIALS.find((m) => m.id === matId);
    if (!catalogMat) return;

    const existingIdx = materials.findIndex((m) => m.materialId === matId);
    if (existingIdx !== -1) {
      setMaterials(materials.filter((m) => m.materialId !== matId));
    } else {
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
    }
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || items.length === 0) {
      alert('Please select a customer and add at least one garment.');
      return;
    }

    const order = mockStore.createOrder({
      customerId: `cust-${Date.now()}`,
      customerName,
      customerPhone,
      customerAddress,
      serviceTier,
      items: items.map((i) => ({
        garmentName: i.garmentName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      materials: materials.map((m) => ({
        name: m.materialName,
        quantity: m.quantity,
        unitPrice: m.unitPrice,
        customerProvided: m.customerProvided,
      })),
      discount,
      initialPayment: payNow
        ? {
            amount: paymentAmount,
            method: paymentMethod,
          }
        : undefined,
      notes,
    });

    setCreatedOrder(order);
    setIsSlipOpen(true);
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
        description="Register customer garments, select service priority, and issue receipt slip."
      />

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Intake Form Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Customer Info */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3 text-text">1. Customer Information</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Customer Full Name *
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
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 0788123456"
                  className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Address / Location
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="e.g. Nyamata Sector, Bugesera"
                  className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </Card>

          {/* Step 2: Garments Selection */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3 text-text">2. Garments Intake</h2>

            {/* Catalog Selector */}
            <div className="mb-4 flex gap-2">
              <select
                value={selectedGarmentId}
                onChange={(e) => setSelectedGarmentId(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
              >
                {MASTER_GARMENTS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} — {g.normalPrice.toLocaleString()} RWF
                  </option>
                ))}
              </select>
              <Button type="button" onClick={handleAddGarment} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>

            {/* Selected Items List */}
            {items.length === 0 ? (
              <p className="text-xs text-text-muted italic text-center py-4 border border-dashed border-border rounded">
                No garments added yet. Select from catalog above.
              </p>
            ) : (
              <div className="divide-y divide-border border border-border rounded">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 text-xs">
                    <div>
                      <span className="font-semibold text-text">{item.garmentName}</span>
                      <span className="block text-[11px] text-text-muted">
                        {item.unitPrice.toLocaleString()} RWF / unit
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-border rounded">
                        <button
                          type="button"
                          onClick={() => handleUpdateGarmentQty(idx, -1)}
                          className="px-2 py-0.5 text-text-muted hover:bg-border/30"
                        >
                          -
                        </button>
                        <span className="px-2.5 font-semibold text-text">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateGarmentQty(idx, 1)}
                          className="px-2 py-0.5 text-text-muted hover:bg-border/30"
                        >
                          +
                        </button>
                      </div>

                      <span className="w-20 text-right font-mono font-semibold text-text">
                        {(item.quantity * item.unitPrice).toLocaleString()} RWF
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveGarment(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Step 3: Priority Tier */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3 text-text">3. Service Priority Tier</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`cursor-pointer rounded-lg border p-3 flex flex-col items-center text-center transition-colors ${
                  serviceTier === 'NORMAL'
                    ? 'border-primary bg-primary-light/50 ring-2 ring-primary'
                    : 'border-border bg-surface hover:bg-border/20'
                }`}
              >
                <input
                  type="radio"
                  name="serviceTier"
                  value="NORMAL"
                  checked={serviceTier === 'NORMAL'}
                  onChange={() => setServiceTier('NORMAL')}
                  className="sr-only"
                />
                <span className="font-semibold text-xs text-text">Standard</span>
                <span className="text-[11px] text-text-muted mt-1">48 hours</span>
                <span className="text-[11px] font-bold text-primary mt-1">Base Price</span>
              </label>

              <label
                className={`cursor-pointer rounded-lg border p-3 flex flex-col items-center text-center transition-colors ${
                  serviceTier === 'EXPRESS'
                    ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500'
                    : 'border-border bg-surface hover:bg-border/20'
                }`}
              >
                <input
                  type="radio"
                  name="serviceTier"
                  value="EXPRESS"
                  checked={serviceTier === 'EXPRESS'}
                  onChange={() => setServiceTier('EXPRESS')}
                  className="sr-only"
                />
                <span className="font-semibold text-xs text-amber-900">⚡ Express</span>
                <span className="text-[11px] text-amber-700 mt-1">24 hours</span>
                <span className="text-[11px] font-bold text-amber-800 mt-1">+50% Charge</span>
              </label>

              <label
                className={`cursor-pointer rounded-lg border p-3 flex flex-col items-center text-center transition-colors ${
                  serviceTier === 'SAME_DAY'
                    ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-500'
                    : 'border-border bg-surface hover:bg-border/20'
                }`}
              >
                <input
                  type="radio"
                  name="serviceTier"
                  value="SAME_DAY"
                  checked={serviceTier === 'SAME_DAY'}
                  onChange={() => setServiceTier('SAME_DAY')}
                  className="sr-only"
                />
                <span className="font-semibold text-xs text-rose-900">🔥 Same Day</span>
                <span className="text-[11px] text-rose-700 mt-1">8 hours</span>
                <span className="text-[11px] font-bold text-rose-800 mt-1">+100% Charge</span>
              </label>
            </div>
          </Card>

          {/* Step 4: Materials */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3 text-text">4. Packaging Materials</h2>
            <div className="space-y-2">
              {MASTER_MATERIALS.map((mat) => {
                const isSelected = materials.some((m) => m.materialId === mat.id);
                return (
                  <div
                    key={mat.id}
                    onClick={() => handleToggleMaterial(mat.id)}
                    className={`cursor-pointer flex items-center justify-between p-2.5 rounded border text-xs transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary-light/30'
                        : 'border-border bg-surface hover:bg-border/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <div>
                        <span className="font-medium text-text">{mat.name}</span>
                        <span className="block text-[10px] text-text-muted">{mat.description}</span>
                      </div>
                    </div>
                    <span className="font-mono font-semibold text-text">
                      {mat.unitPrice.toLocaleString()} RWF
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Order Summary & Actions Column */}
        <div className="space-y-6">
          <Card className="p-4 sticky top-4">
            <h2 className="text-sm font-semibold mb-3 text-text">Order Summary</h2>

            <div className="space-y-2 text-xs border-b border-border pb-3">
              <div className="flex justify-between text-text-muted">
                <span>Garments Subtotal:</span>
                <span className="font-mono text-text">{garmentsSubtotal.toLocaleString()} RWF</span>
              </div>

              {priorityFee > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Priority ({serviceTier}):</span>
                  <span className="font-mono">+{priorityFee.toLocaleString()} RWF</span>
                </div>
              )}

              {materialsSubtotal > 0 && (
                <div className="flex justify-between text-text-muted">
                  <span>Materials Charge:</span>
                  <span className="font-mono text-text">+{materialsSubtotal.toLocaleString()} RWF</span>
                </div>
              )}

              <div className="flex justify-between items-center text-text-muted pt-1">
                <span>Discount (RWF):</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-20 text-right rounded border border-border px-1.5 py-0.5 font-mono text-xs focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Total */}
            <div className="my-3 flex justify-between items-center font-bold text-sm text-text">
              <span>TOTAL:</span>
              <span className="font-mono text-base text-primary">
                {totalAmount.toLocaleString()} RWF
              </span>
            </div>

            {/* Initial Payment Options */}
            <div className="border-t border-border pt-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text">
                <input
                  type="checkbox"
                  checked={payNow}
                  onChange={(e) => setPayNow(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                Record Initial Payment Now
              </label>

              {payNow && (
                <div className="space-y-2 pl-5">
                  <div>
                    <label className="block text-[11px] text-text-muted mb-0.5">Amount Paid (RWF)</label>
                    <input
                      type="number"
                      min="0"
                      max={totalAmount}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                      className="w-full rounded border border-border px-2 py-1 font-mono text-xs text-text focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-text-muted mb-0.5">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full rounded border border-border px-2 py-1 text-xs text-text focus:border-primary focus:outline-none"
                    >
                      <option value="MOBILE_MONEY">Mobile Money (MTN/Airtel)</option>
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CARD">Card</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="mt-3">
              <label className="block text-[11px] text-text-muted mb-1">Order Notes / Stains</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Special care for silk dress"
                className="w-full rounded border border-border px-2 py-1 text-xs text-text focus:border-primary focus:outline-none"
              />
            </div>

            {/* Create Trigger Button */}
            <Button type="submit" className="w-full mt-4" size="lg">
              <CheckCircle className="h-4 w-4 mr-1.5" /> Create Order & Print Slip
            </Button>
          </Card>
        </div>
      </form>

      {/* Slip Modal Preview */}
      <OrderSlipModal
        order={createdOrder}
        isOpen={isSlipOpen}
        onClose={() => {
          setIsSlipOpen(false);
          navigate('/orders');
        }}
      />
    </div>
  );
}
