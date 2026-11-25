import { apiFetch } from '../lib/api-client';
import type { UserRole } from '../types/auth';
import type {
  BusinessSettings,
  DriverOption,
  PublicSettings,
  ServiceItem,
  SetupStatus,
  StaffUser,
} from '../types/settings';

// ── Business settings ────────────────────────────────────────────────────────
export function getSettings(): Promise<BusinessSettings> {
  return apiFetch<BusinessSettings>('/settings');
}

export function updateSettings(input: Partial<BusinessSettings>): Promise<BusinessSettings> {
  return apiFetch<BusinessSettings>('/settings', { method: 'PATCH', body: input });
}

export function getSetupStatus(): Promise<SetupStatus> {
  return apiFetch<SetupStatus>('/settings/setup-status');
}

export function getPublicSettings(): Promise<PublicSettings> {
  return apiFetch<PublicSettings>('/settings/public', { auth: false });
}

// ── Price list ───────────────────────────────────────────────────────────────
export function listServiceItems(includeInactive = false): Promise<ServiceItem[]> {
  return apiFetch<ServiceItem[]>(`/catalog/items${includeInactive ? '?includeInactive=true' : ''}`);
}

export type ServiceItemInput = Partial<
  Pick<ServiceItem, 'name' | 'category' | 'priceStandard' | 'priceExpress' | 'priceSameDay' | 'isActive' | 'sortOrder'>
>;

export function createServiceItem(input: ServiceItemInput): Promise<ServiceItem> {
  return apiFetch<ServiceItem>('/catalog/items', { method: 'POST', body: input });
}

export function updateServiceItem(id: string, input: ServiceItemInput): Promise<ServiceItem> {
  return apiFetch<ServiceItem>(`/catalog/items/${id}`, { method: 'PATCH', body: input });
}

export function listPublicServiceItems(): Promise<ServiceItem[]> {
  return apiFetch<ServiceItem[]>('/catalog/public', { auth: false });
}

// ── Staff ────────────────────────────────────────────────────────────────────
export function listStaff(): Promise<StaffUser[]> {
  return apiFetch<StaffUser[]>('/users');
}

export function listDrivers(): Promise<DriverOption[]> {
  return apiFetch<DriverOption[]>('/users/drivers');
}

export interface CreateStaffInput {
  fullName: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  password: string;
}

export function createStaff(input: CreateStaffInput): Promise<StaffUser> {
  return apiFetch<StaffUser>('/users', { method: 'POST', body: input });
}

export function updateStaff(
  id: string,
  input: Partial<Pick<StaffUser, 'fullName' | 'phone' | 'role' | 'isActive'>>,
): Promise<StaffUser> {
  return apiFetch<StaffUser>(`/users/${id}`, { method: 'PATCH', body: input });
}

export function resetStaffPassword(id: string, password: string): Promise<void> {
  return apiFetch<void>(`/users/${id}/reset-password`, { method: 'POST', body: { password } });
}
