import { apiFetch } from '../lib/api-client';
import type { PaginatedResult } from '../types/customer';

export interface ApiPickup {
  id: string;
  pickupNumber: string;
  customerId: string;
  customer?: {
    id: string;
    name: string;
    phone: string;
    address?: string;
  };
  orderId?: string;
  pickupAddress: string;
  scheduledDate: string;
  timeSlot: string | null;
  status:
    | 'REQUESTED'
    | 'SCHEDULED'
    | 'DRIVER_ASSIGNED'
    | 'ON_THE_WAY'
    | 'PICKED_UP'
    | 'CANCELLED';
  assignedDriverId?: string;
  assignedDriverName?: string;
  notes?: string;
  createdAt: string;
}

export interface ApiDelivery {
  id: string;
  deliveryNumber: string;
  orderId: string;
  order?: {
    id: string;
    orderNumber: string;
    customer?: {
      name: string;
      phone: string;
    };
  };
  deliveryAddress: string;
  scheduledDate: string;
  timeSlot: string | null;
  amountCollectable: number;
  status:
    | 'SCHEDULED'
    | 'DRIVER_ASSIGNED'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'FAILED'
    | 'CANCELLED';
  assignedDriverId?: string;
  assignedDriverName?: string;
  notes?: string;
  createdAt: string;
}

/** One job as a driver sees it: no prices or payment status (business rule #8). */
export interface DriverJob {
  id: string;
  type: 'PICKUP' | 'DELIVERY';
  reference: string;
  orderNumber: string | null;
  status: string;
  scheduledDate: string;
  timeSlot: string | null;
  customerName: string;
  customerPhone: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  amountToCollect: number;
  notes: string | null;
}

export interface DriverTasksFeed {
  driverId: string;
  pickups: DriverJob[];
  deliveries: DriverJob[];
  activePickupsCount: number;
  activeDeliveriesCount: number;
}

export interface CreatePickupInput {
  customerId: string;
  orderId?: string;
  pickupAddress: string;
  scheduledDate: string;
  timeSlot?: string;
  status?: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  notes?: string;
}

export interface UpdatePickupInput {
  status?: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  scheduledDate?: string;
  timeSlot?: string;
  notes?: string;
}

export interface CreateDeliveryInput {
  orderId: string;
  deliveryAddress: string;
  scheduledDate: string;
  timeSlot?: string;
  status?: string;
  amountCollectable?: number;
  assignedDriverId?: string;
  assignedDriverName?: string;
  notes?: string;
}

export interface UpdateDeliveryInput {
  status?: string;
  assignedDriverId?: string;
  assignedDriverName?: string;
  scheduledDate?: string;
  timeSlot?: string;
  amountCollectable?: number;
  notes?: string;
}

export function listPickups(params: {
  page?: number;
  perPage?: number;
  search?: string;
  date?: string;
  driverId?: string;
  status?: string;
} = {}): Promise<PaginatedResult<ApiPickup>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.perPage) query.set('perPage', String(params.perPage));
  if (params.search) query.set('search', params.search);
  if (params.date) query.set('date', params.date);
  if (params.driverId) query.set('driverId', params.driverId);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return apiFetch<PaginatedResult<ApiPickup>>(`/pickups${qs ? `?${qs}` : ''}`);
}

export function createPickup(input: CreatePickupInput): Promise<ApiPickup> {
  return apiFetch<ApiPickup>('/pickups', {
    method: 'POST',
    body: input,
  });
}

export interface PublicPickupRequestInput {
  name: string;
  phone: string;
  address: string;
  scheduledDate: string;
  timeSlot?: string;
  notes?: string;
}

/**
 * Customer-facing pickup request (no login). The server finds the customer
 * by phone or registers them, then creates the pickup.
 */
export function requestPickup(input: PublicPickupRequestInput): Promise<{ pickupNumber: string }> {
  return apiFetch<{ pickupNumber: string }>('/pickups/request', {
    method: 'POST',
    body: input,
    auth: false,
  });
}

export function updatePickup(
  id: string,
  input: UpdatePickupInput,
): Promise<ApiPickup> {
  return apiFetch<ApiPickup>(`/pickups/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function listDeliveries(params: {
  page?: number;
  perPage?: number;
  search?: string;
  date?: string;
  driverId?: string;
  status?: string;
} = {}): Promise<PaginatedResult<ApiDelivery>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.perPage) query.set('perPage', String(params.perPage));
  if (params.search) query.set('search', params.search);
  if (params.date) query.set('date', params.date);
  if (params.driverId) query.set('driverId', params.driverId);
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  return apiFetch<PaginatedResult<ApiDelivery>>(
    `/deliveries${qs ? `?${qs}` : ''}`,
  );
}

export function createDelivery(
  input: CreateDeliveryInput,
): Promise<ApiDelivery> {
  return apiFetch<ApiDelivery>('/deliveries', {
    method: 'POST',
    body: input,
  });
}

export function updateDelivery(
  id: string,
  input: UpdateDeliveryInput,
): Promise<ApiDelivery> {
  return apiFetch<ApiDelivery>(`/deliveries/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

/** The signed-in driver's own jobs. */
export function getMyDriverTasks(): Promise<DriverTasksFeed> {
  return apiFetch<DriverTasksFeed>('/drivers/me/tasks');
}
