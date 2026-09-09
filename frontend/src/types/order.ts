export type LaundryStage =
  | 'RECEIVED'
  | 'SORTING'
  | 'WASHING'
  | 'DRYING'
  | 'IRONING'
  | 'QUALITY_CHECK'
  | 'PACKING'
  | 'READY'
  | 'DELIVERED';

export type ServiceTier = 'NORMAL' | 'EXPRESS' | 'SAME_DAY';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CARD';

export interface OrderItem {
  id: string;
  garmentName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface OrderMaterialItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customerProvided: boolean;
}

export interface OrderStatusHistoryItem {
  id: string;
  stage: LaundryStage;
  changedBy: string;
  changedAt: string;
  notes?: string;
}

export interface OrderPaymentItem {
  id: string;
  receiptNumber: string;
  amount: number;
  method: PaymentMethod;
  receivedBy: string;
  receivedAt: string;
  reference?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. EC-001245
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  serviceTier: ServiceTier;
  currentStage: LaundryStage;
  expectedCompletion: string;
  coverCode?: string; // e.g. C-001245
  bagCode?: string; // e.g. B-001245
  hangersCount: number;
  envelopesCount: number;
  items: OrderItem[];
  materials: OrderMaterialItem[];
  subtotal: number;
  materialCharges: number;
  priorityFee: number;
  discount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  statusHistory: OrderStatusHistoryItem[];
  payments: OrderPaymentItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GarmentCatalogItem {
  id: string;
  name: string;
  category: string;
  normalPrice: number;
  expressPrice: number;
  sameDayPrice: number;
}

export interface MaterialCatalogItem {
  id: string;
  name: string;
  unitPrice: number;
  description: string;
}
