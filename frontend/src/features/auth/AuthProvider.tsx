import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { apiFetch } from '../../lib/api-client';
import { clearStoredAuth, readStoredAuth, writeStoredAuth } from '../../lib/auth-storage';
import type { AuthUser, LoginResponse } from '../../types/auth';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(
    () => readStoredAuth()?.user ?? null,
  );

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
    clearStoredAuth();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
