import type { UserRole } from './auth';

/** Backend payment method codes (backend/src/modules/payments/entities/payment.entity.ts). */
export type ApiPaymentMethod = 'CASH' | 'MOMO' | 'BANK_TRANSFER' | 'CARD';

export const PAYMENT_METHOD_LABELS: Record<ApiPaymentMethod, string> = {
  CASH: 'Cash',
  MOMO: 'Mobile Money',
  BANK_TRANSFER: 'Bank Transfer',
  CARD: 'Card',
};

export type MaterialType = 'BAG' | 'COVER' | 'HANGER' | 'ENVELOPE';

export const MATERIAL_LABELS: Record<MaterialType, string> = {
  BAG: 'Bag',
  COVER: 'Cover',
  HANGER: 'Hanger',
  ENVELOPE: 'Envelope',
};

export type ApiServiceTier = 'STANDARD' | 'EXPRESS' | 'SAME_DAY';

export const TIER_LABELS: Record<ApiServiceTier, string> = {
  STANDARD: 'Standard',
  EXPRESS: 'Express',
  SAME_DAY: 'Same Day',
};

export interface OpeningHoursDay {
  day: number; // 0 = Sunday
  closed: boolean;
  open?: string;
  close?: string;
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface BusinessSettings {
  businessName: string;
  ownerName: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  address: string | null;
  tin: string | null;
  openingHours: OpeningHoursDay[];
  timeSlots: string[];
  enabledPaymentMethods: ApiPaymentMethod[];
  materialCharges: Partial<Record<MaterialType, number>>;
  turnaround: Partial<Record<ApiServiceTier, string>>;
  allowDiscounts: boolean;
  discountRoles: UserRole[];
  receiptFooter: string | null;
  updatedAt: string;
}

export type PublicSettings = Pick<
  BusinessSettings,
  'businessName' | 'phone' | 'whatsappNumber' | 'address' | 'openingHours' | 'timeSlots' | 'turnaround'
>;

export interface SetupStatus {
  complete: boolean;
  items: { key: string; done: boolean; label: string }[];
}

export interface ServiceItem {
  id: string;
  name: string;
  category: string | null;
  priceStandard: number | null;
  priceExpress: number | null;
  priceSameDay: number | null;
  isActive: boolean;
  sortOrder: number;
}

export function priceForTier(item: ServiceItem, tier: ApiServiceTier): number | null {
  if (tier === 'EXPRESS') return item.priceExpress;
  if (tier === 'SAME_DAY') return item.priceSameDay;
  return item.priceStandard;
}

export interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface DriverOption {
  id: string;
  fullName: string;
  phone: string | null;
}
