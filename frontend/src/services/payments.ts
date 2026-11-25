import { apiFetch } from '../lib/api-client';
import type { PaginatedResult } from '../types/customer';
import type { ApiOrderPayment } from './orders';

export interface PaymentSummary {
  todayTotal: number;
  methodBreakdown: {
    CASH: number;
    MOMO: number;
    BANK_TRANSFER: number;
    CARD: number;
  };
  totalOutstanding: number;
}

export interface RecordPaymentInput {
  amount: number;
  paymentMethod: 'CASH' | 'MOMO' | 'BANK_TRANSFER' | 'CARD';
  referenceNumber?: string;
  notes?: string;
}

export interface ListPaymentsParams {
  page?: number;
  perPage?: number;
  search?: string;
  paymentMethod?: string;
  status?: string;
  orderId?: string;
}

export function recordOrderPayment(
  orderId: string,
  input: RecordPaymentInput,
): Promise<ApiOrderPayment> {
  return apiFetch<ApiOrderPayment>(`/orders/${orderId}/payments`, {
    method: 'POST',
    body: input,
  });
}

export function listPayments(
  params: ListPaymentsParams = {},
): Promise<PaginatedResult<ApiOrderPayment>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.perPage) query.set('perPage', String(params.perPage));
  if (params.search) query.set('search', params.search);
  if (params.paymentMethod) query.set('paymentMethod', params.paymentMethod);
  if (params.status) query.set('status', params.status);
  if (params.orderId) query.set('orderId', params.orderId);
  const qs = query.toString();
  return apiFetch<PaginatedResult<ApiOrderPayment>>(
    `/payments${qs ? `?${qs}` : ''}`,
  );
}

export function getPaymentsSummary(): Promise<PaymentSummary> {
  return apiFetch<PaymentSummary>('/payments/summary');
}

export function getOrderPayments(orderId: string): Promise<ApiOrderPayment[]> {
  return apiFetch<ApiOrderPayment[]>(`/orders/${orderId}/payments`);
}
