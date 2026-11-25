import type { ApiOrder } from './orders';
import type { LaundryStage, Order, PaymentStatus, ServiceTier } from '../types/order';

/** Converts the API's order shape into the UI's Order type. */
export function mapApiOrderToOrder(api: ApiOrder): Order {
  const currentStage = (api.status === 'CANCELLED' ? 'RECEIVED' : api.status) as LaundryStage;
  const serviceTier = (api.serviceTier === 'STANDARD' ? 'NORMAL' : api.serviceTier) as ServiceTier;
  const paymentStatus: PaymentStatus =
    api.paymentStatus === 'PAID'
      ? 'PAID'
      : api.paymentStatus === 'PARTIALLY_PAID'
        ? 'PARTIAL'
        : 'UNPAID';

  return {
    id: api.id,
    orderNumber: api.orderNumber,
    customerId: api.customerId,
    customerName: api.customer?.name ?? 'Customer',
    customerPhone: api.customer?.phone ?? '',
    customerAddress: api.customer?.address,
    serviceTier,
    currentStage,
    expectedCompletion: api.expectedCompletion ?? new Date().toISOString(),
    coverCode: api.storageHangerId,
    bagCode: api.storageBoxId,
    hangersCount: api.materials.filter((m) => m.materialType === 'HANGER').reduce((s, m) => s + m.quantity, 0),
    envelopesCount: api.materials.filter((m) => m.materialType === 'ENVELOPE').reduce((s, m) => s + m.quantity, 0),
    items: api.items.map((it, idx) => ({
      id: it.id ?? `item-${idx}`,
      garmentName: it.garmentName,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      totalPrice: Number(it.lineTotal ?? it.quantity * it.unitPrice),
      notes: it.notes,
    })),
    materials: api.materials.map((m, idx) => ({
      id: m.id ?? `mat-${idx}`,
      name: m.materialType,
      quantity: m.quantity,
      unitPrice: Number(m.unitCharge),
      totalPrice: Number(m.totalCharge ?? m.quantity * m.unitCharge),
      customerProvided: m.customerProvided ?? false,
    })),
    subtotal: Number(api.subtotal),
    materialCharges: Number(api.materialCharges),
    priorityFee: 0,
    discount: Number(api.discount),
    totalAmount: Number(api.total),
    amountPaid: Number(api.amountPaid),
    balanceDue: Number(api.balance),
    paymentStatus,
    statusHistory: (api.statusHistory ?? []).map((sh) => ({
      id: sh.id,
      stage: (sh.newStatus === 'CANCELLED' ? 'RECEIVED' : sh.newStatus) as LaundryStage,
      changedBy: sh.changedByUserId ?? 'Staff',
      changedAt: sh.createdAt,
      notes: sh.notes,
    })),
    payments: (api.payments ?? []).map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      amount: Number(p.amount),
      method: p.paymentMethod === 'MOMO' ? 'MOBILE_MONEY' : p.paymentMethod,
      receivedBy: p.receivedByUserId ?? 'Cashier',
      receivedAt: p.createdAt,
      reference: p.referenceNumber,
    })),
    notes: api.notes,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}
