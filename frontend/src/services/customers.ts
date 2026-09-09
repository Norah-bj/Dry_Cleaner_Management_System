import { apiFetch } from '../lib/api-client';
import type {
  Customer,
  CreateCustomerInput,
  PaginatedResult,
  UpdateCustomerInput,
} from '../types/customer';

export interface ListCustomersParams {
  page?: number;
  perPage?: number;
  search?: string;
}

export function listCustomers(
  params: ListCustomersParams = {},
): Promise<PaginatedResult<Customer>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.perPage) query.set('perPage', String(params.perPage));
  if (params.search) query.set('search', params.search);
  const qs = query.toString();
  return apiFetch<PaginatedResult<Customer>>(`/customers${qs ? `?${qs}` : ''}`);
}

export function getCustomer(id: string): Promise<Customer> {
  return apiFetch<Customer>(`/customers/${id}`);
}

export function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  return apiFetch<Customer>('/customers', { method: 'POST', body: input });
}

export function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
): Promise<Customer> {
  return apiFetch<Customer>(`/customers/${id}`, {
    method: 'PATCH',
    body: input,
  });
}
