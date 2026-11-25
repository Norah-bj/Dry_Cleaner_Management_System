import { apiFetch } from '../lib/api-client';
import type { PaginatedResult } from '../types/customer';

export interface ApiOrderItem {
  id?: string;
  garmentName: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
  serviceTier?: 'STANDARD' | 'EXPRESS' | 'SAME_DAY';
  notes?: string;
}

export interface ApiOrderMaterial {
  id?: string;
  materialType: 'BAG' | 'COVER' | 'HANGER' | 'ENVELOPE';
  quantity: number;
  customerProvided?: boolean;
  unitCharge: number;
  totalCharge?: number;
}

export interface ApiOrderStatusHistory {
  id: string;
  previousStatus: string | null;
  newStatus: string;
  notes?: string;
  changedByUserId?: string;
  createdAt: string;
}

export interface ApiOrderPayment {
  id: string;
  receiptNumber: string;
  amount: number;
  paymentMethod: 'CASH' | 'MOMO' | 'BANK_TRANSFER' | 'CARD';
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  referenceNumber?: string;
  receivedByUserId?: string;
  notes?: string;
  createdAt: string;
}

export interface ApiOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: {
    id: string;
    customerNumber: string;
    name: string;
    phone: string;
    address?: string;
  };
  serviceTier: 'STANDARD' | 'EXPRESS' | 'SAME_DAY';
  status:
    | 'RECEIVED'
    | 'SORTING'
    | 'WASHING'
    | 'DRYING'
    | 'IRONING'
    | 'QUALITY_CHECK'
    | 'PACKING'
    | 'READY'
    | 'DELIVERED'
    | 'CANCELLED';
  storageHangerId?: string;
  storageBoxId?: string;
  subtotal: number;
  materialCharges: number;
  discount: number;
  total: number;
  amountPaid: number;
  balance: number;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  expectedCompletion?: string;
  notes?: string;
  items: ApiOrderItem[];
  materials: ApiOrderMaterial[];
  statusHistory?: ApiOrderStatusHistory[];
  payments?: ApiOrderPayment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  customerId: string;
  serviceTier?: 'STANDARD' | 'EXPRESS' | 'SAME_DAY';
  storageHangerId?: string;
  storageBoxId?: string;
  discount?: number;
  expectedCompletion?: string;
  notes?: string;
  /** Prices are looked up on the server from the price list; never sent. */
  items: {
    serviceItemId: string;
    quantity: number;
    notes?: string;
  }[];
  /** Charges come from Settings on the server; customer-provided items are free. */
  materials?: {
    materialType: 'BAG' | 'COVER' | 'HANGER' | 'ENVELOPE';
    quantity: number;
    customerProvided?: boolean;
  }[];
}

export interface ListOrdersParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  serviceTier?: string;
  customerId?: string;
}

export function listOrders(
  params: ListOrdersParams = {},
): Promise<PaginatedResult<ApiOrder>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.perPage) query.set('perPage', String(params.perPage));
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.paymentStatus) query.set('paymentStatus', params.paymentStatus);
  if (params.serviceTier) query.set('serviceTier', params.serviceTier);
  if (params.customerId) query.set('customerId', params.customerId);
  const qs = query.toString();
  return apiFetch<PaginatedResult<ApiOrder>>(`/orders${qs ? `?${qs}` : ''}`);
}

export function getOrder(id: string): Promise<ApiOrder> {
  return apiFetch<ApiOrder>(`/orders/${id}`);
}

/** What the public tracking endpoint returns: no phone, address or staff data. */
export interface PublicTrackedOrder {
  orderNumber: string;
  customerFirstName: string;
  status: string;
  serviceTier: string;
  expectedCompletion: string | null;
  total: number;
  amountPaid: number;
  balance: number;
  paymentStatus: string;
  items: { garmentName: string; quantity: number }[];
}

export function trackOrder(orderNumber: string): Promise<PublicTrackedOrder> {
  return apiFetch<PublicTrackedOrder>(`/orders/track/${encodeURIComponent(orderNumber)}`, {
    auth: false,
  });
}

export function createOrder(input: CreateOrderInput): Promise<ApiOrder> {
  return apiFetch<ApiOrder>('/orders', {
    method: 'POST',
    body: input,
  });
}

export function updateOrder(
  id: string,
  input: {
    storageHangerId?: string;
    storageBoxId?: string;
    expectedCompletion?: string;
    discount?: number;
    notes?: string;
  },
): Promise<ApiOrder> {
  return apiFetch<ApiOrder>(`/orders/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function updateOrderStatus(
  id: string,
  input: {
    status: string;
    notes?: string;
  },
): Promise<ApiOrder> {
  return apiFetch<ApiOrder>(`/orders/${id}/status`, {
    method: 'PATCH',
    body: input,
  });
}
