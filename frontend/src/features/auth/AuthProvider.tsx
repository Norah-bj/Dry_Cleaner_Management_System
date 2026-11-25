import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, logoutSession } from '../../lib/api-client';
import {
  AUTH_STORAGE_KEY,
  SESSION_ENDED_EVENT,
  readStoredAuth,
  writeStoredAuth,
} from '../../lib/auth-storage';
import type { AuthUser, LoginResponse } from '../../types/auth';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(
    () => readStoredAuth()?.user ?? null,
  );

  // Session ended by the API client (refresh failed), or signed in/out in
  // another tab: follow what's stored.
  useEffect(() => {
    const sync = () => setUser(readStoredAuth()?.user ?? null);
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_STORAGE_KEY || e.key === null) sync();
    };
    window.addEventListener(SESSION_ENDED_EVENT, sync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SESSION_ENDED_EVENT, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    writeStoredAuth(result);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    void logoutSession();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
