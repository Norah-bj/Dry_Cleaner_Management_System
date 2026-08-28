/** Mirrors backend/src/modules/users/entities/user.entity.ts UserRole. */
export type UserRole =
  | 'super_admin'
  | 'manager'
  | 'receptionist'
  | 'cashier'
  | 'laundry_staff'
  | 'driver';

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  receptionist: 'Receptionist',
  cashier: 'Cashier',
  laundry_staff: 'Laundry Staff',
  driver: 'Driver',
};

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

/** Shape of POST /api/v1/auth/login's response. */
export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}
