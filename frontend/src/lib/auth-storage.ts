import type { AuthUser } from '../types/auth';

interface StoredAuth {
  accessToken: string;
  user: AuthUser;
}

const STORAGE_KEY = 'edcms.auth';

/**
 * Single source of truth for the persisted session, read by both the
 * AuthProvider (React state) and the plain api-client module (which has
 * no access to React context). Kept in sync by AuthProvider on
 * login/logout.
 */
export function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function writeStoredAuth(auth: StoredAuth): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  } catch {
    // Storage unavailable (private mode, quota, etc.) - session just
    // won't survive a refresh; not fatal to the current page load.
  }
}

export function clearStoredAuth(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // See writeStoredAuth.
  }
}
