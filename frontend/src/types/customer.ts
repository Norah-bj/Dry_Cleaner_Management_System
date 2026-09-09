/** Mirrors backend/src/modules/customers/entities/customer.entity.ts. */
export type CustomerStatus = 'active' | 'inactive';

export interface Customer {
  id: string;
  customerNumber: string;
  name: string;
  phone: string;
  alternativePhone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
  };
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  alternativePhone?: string;
  address?: string;
  notes?: string;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput> & {
  status?: CustomerStatus;
};
