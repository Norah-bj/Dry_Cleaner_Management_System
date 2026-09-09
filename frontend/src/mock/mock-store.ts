import { INITIAL_MOCK_ORDERS } from './mock-data';
import type { LaundryStage, Order, OrderItem, OrderMaterialItem, PaymentMethod, ServiceTier } from '../types/order';

const STORAGE_KEY = 'edcms_mock_orders_v1';
const LISTENERS = new Set<() => void>();

function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to parse mock orders from localStorage:', err);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_ORDERS));
  return INITIAL_MOCK_ORDERS;
}

function saveOrders(orders: Order[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error('Failed to save mock orders to localStorage:', err);
  }
  LISTENERS.forEach((listener) => listener());
}

export const mockStore = {
  subscribe(listener: () => void): () => void {
    LISTENERS.add(listener);
    return () => {
      LISTENERS.delete(listener);
    };
  },

  getOrders(): Order[] {
    return loadOrders();
  },

  getOrderById(id: string): Order | undefined {
    return loadOrders().find((o) => o.id === id || o.orderNumber === id);
  },

  createOrder(payload: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    serviceTier: ServiceTier;
    items: Array<{ garmentName: string; quantity: number; unitPrice: number }>;
    materials: Array<{ name: string; quantity: number; unitPrice: number; customerProvided: boolean }>;
    discount?: number;
    initialPayment?: { amount: number; method: PaymentMethod; reference?: string };
    notes?: string;
    expectedCompletionDate?: string;
  }): Order {
    const orders = loadOrders();
    const sequenceNum = 1248 + orders.length;
    const orderNumber = `EC-${String(sequenceNum).padStart(6, '0')}`;
    const coverCode = `C-${String(sequenceNum).padStart(6, '0')}`;
    const bagCode = `B-${String(sequenceNum).padStart(6, '0')}`;
    const nowIso = new Date().toISOString();

    const formattedItems: OrderItem[] = payload.items.map((item, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      garmentName: item.garmentName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
    }));

    const formattedMaterials: OrderMaterialItem[] = payload.materials.map((mat, idx) => ({
      id: `mat-${Date.now()}-${idx}`,
      name: mat.name,
      quantity: mat.quantity,
      unitPrice: mat.customerProvided ? 0 : mat.unitPrice,
      totalPrice: mat.customerProvided ? 0 : mat.quantity * mat.unitPrice,
      customerProvided: mat.customerProvided,
    }));

    const subtotal = formattedItems.reduce((acc, i) => acc + i.totalPrice, 0);
    const materialCharges = formattedMaterials.reduce((acc, m) => acc + m.totalPrice, 0);

    let priorityMultiplier = 0;
    if (payload.serviceTier === 'EXPRESS') priorityMultiplier = 0.5;
    if (payload.serviceTier === 'SAME_DAY') priorityMultiplier = 1.0;
    const priorityFee = Math.round(subtotal * priorityMultiplier);

    const discount = payload.discount || 0;
    const totalAmount = Math.max(0, subtotal + materialCharges + priorityFee - discount);

    let amountPaid = 0;
    const payments = [];

    if (payload.initialPayment && payload.initialPayment.amount > 0) {
      amountPaid = Math.min(totalAmount, payload.initialPayment.amount);
      payments.push({
        id: `pay-${Date.now()}`,
        receiptNumber: `R-${String(sequenceNum).padStart(6, '0')}`,
        amount: amountPaid,
        method: payload.initialPayment.method,
        receivedBy: 'Staff Receptionist',
        receivedAt: nowIso,
        reference: payload.initialPayment.reference,
      });
    }

    const balanceDue = totalAmount - amountPaid;
    let paymentStatus: Order['paymentStatus'] = 'UNPAID';
    if (amountPaid >= totalAmount) paymentStatus = 'PAID';
    else if (amountPaid > 0) paymentStatus = 'PARTIAL';

    // Estimate completion based on tier if not provided
    let expectedCompletion = payload.expectedCompletionDate;
    if (!expectedCompletion) {
      let hoursToAdd = 48; // Normal
      if (payload.serviceTier === 'EXPRESS') hoursToAdd = 24;
      if (payload.serviceTier === 'SAME_DAY') hoursToAdd = 8;
      expectedCompletion = new Date(Date.now() + hoursToAdd * 3600 * 1000).toISOString();
    }

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customerId: payload.customerId,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerAddress: payload.customerAddress,
      serviceTier: payload.serviceTier,
      currentStage: 'RECEIVED',
      expectedCompletion,
      coverCode,
      bagCode,
      hangersCount: formattedItems.reduce((acc, i) => acc + i.quantity, 0),
      envelopesCount: 0,
      items: formattedItems,
      materials: formattedMaterials,
      subtotal,
      materialCharges,
      priorityFee,
      discount,
      totalAmount,
      amountPaid,
      balanceDue,
      paymentStatus,
      statusHistory: [
        {
          id: `hist-${Date.now()}`,
          stage: 'RECEIVED',
          changedBy: 'Staff Receptionist',
          changedAt: nowIso,
          notes: 'Order created at intake',
        },
      ],
      payments,
      notes: payload.notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    orders.unshift(newOrder);
    saveOrders(orders);
    return newOrder;
  },

  updateOrderStatus(orderId: string, nextStage: LaundryStage, staffName = 'Laundry Staff', notes?: string): Order | undefined {
    const orders = loadOrders();
    const idx = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
    if (idx === -1) return undefined;

    const target = orders[idx];
    if (target.currentStage === nextStage) return target;

    const nowIso = new Date().toISOString();
    const updated: Order = {
      ...target,
      currentStage: nextStage,
      updatedAt: nowIso,
      statusHistory: [
        ...target.statusHistory,
        {
          id: `hist-${Date.now()}`,
          stage: nextStage,
          changedBy: staffName,
          changedAt: nowIso,
          notes,
        },
      ],
    };

    orders[idx] = updated;
    saveOrders(orders);
    return updated;
  },

  addPayment(orderId: string, amount: number, method: PaymentMethod, receivedBy = 'Cashier', reference?: string): Order | undefined {
    const orders = loadOrders();
    const idx = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
    if (idx === -1) return undefined;

    const target = orders[idx];
    const nowIso = new Date().toISOString();
    const newAmountPaid = target.amountPaid + amount;
    const newBalanceDue = Math.max(0, target.totalAmount - newAmountPaid);
    
    let paymentStatus: Order['paymentStatus'] = target.paymentStatus;
    if (newAmountPaid >= target.totalAmount) paymentStatus = 'PAID';
    else if (newAmountPaid > 0) paymentStatus = 'PARTIAL';

    const newPayment = {
      id: `pay-${Date.now()}`,
      receiptNumber: `R-${Math.floor(100000 + Math.random() * 900000)}`,
      amount,
      method,
      receivedBy,
      receivedAt: nowIso,
      reference,
    };

    const updated: Order = {
      ...target,
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
      paymentStatus,
      updatedAt: nowIso,
      payments: [...target.payments, newPayment],
    };

    orders[idx] = updated;
    saveOrders(orders);
    return updated;
  },

  resetToDefaults(): void {
    localStorage.removeItem(STORAGE_KEY);
    saveOrders(INITIAL_MOCK_ORDERS);
  },
};
