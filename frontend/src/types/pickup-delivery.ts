export type PickupStatus =
  | 'REQUESTED'
  | 'SCHEDULED'
  | 'DRIVER_ASSIGNED'
  | 'ON_THE_WAY'
  | 'PICKED_UP'
  | 'CANCELLED';

export type DeliveryStatus =
  | 'SCHEDULED'
  | 'DRIVER_ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  isAvailable: boolean;
}

export interface PickupRequest {
  id: string;
  requestNumber: string; // e.g. PU-000123
  customerId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  latitude?: number;
  longitude?: number;
  preferredDate: string;
  preferredTimeFrom: string; // e.g. "14:00"
  preferredTimeTo: string;   // e.g. "16:00"
  status: PickupStatus;
  driverId?: string;
  driverName?: string;
  orderIds: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryRequest {
  id: string;
  requestNumber: string; // e.g. DL-000123
  customerId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  latitude?: number;
  longitude?: number;
  scheduledDate: string;
  scheduledTimeFrom: string;
  scheduledTimeTo: string;
  status: DeliveryStatus;
  driverId?: string;
  driverName?: string;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  amountCollectable: number; // balance due on delivery
  completedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
