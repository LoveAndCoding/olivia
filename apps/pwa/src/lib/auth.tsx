/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@olivia/contracts';
import { checkAuthStatus, getCurrentUser } from './auth-api';

const SESSION_TOKEN_KEY = 'olivia-session-token';

type AuthState =
  | { status: 'loading' }
  | { status: 'uninitialized' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: User };

type AuthContextValue = {
  state: AuthState;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  householdInitialized: boolean;
  login: (sessionToken: string, user: User) => void;
  logout: () => void;
  getSessionToken: () => string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function getStoredSessionToken(): string | null {
  return window.localStorage.getItem(SESSION_TOKEN_KEY);
}

export function storeSessionToken(token: string): void {
  window.localStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function clearSessionToken(): void {
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { initialized, authEnabled } = await checkAuthStatus();
        if (cancelled) return;

        // When server-side auth is disabled, skip the auth gate entirely
        if (!authEnabled) {
          setState({ status: 'authenticated', user: { id: '00000000-0000-0000-0000-000000000000', name: 'Local User', email: '', role: 'admin' } as import('@olivia/contracts').User });
          return;
        }

        if (!initialized) {
          setState({ status: 'uninitialized' });
          return;
        }

        const token = getStoredSessionToken();
        if (!token) {
          setState({ status: 'unauthenticated' });
          return;
        }

        const { user } = await getCurrentUser(token);
        if (cancelled) return;
        setState({ status: 'authenticated', user });
      } catch {
        if (cancelled) return;
        // If auth status check fails (server down, auth disabled), fall through
        // to unauthenticated so the app can still attempt to render
        setState({ status: 'unauthenticated' });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback((sessionToken: string, user: User) => {
    storeSessionToken(sessionToken);
    setState({ status: 'authenticated', user });
  }, []);

  const logout = useCallback(() => {
    clearSessionToken();
    setState({ status: 'unauthenticated' });
  }, []);

  const getSessionToken = useCallback(() => getStoredSessionToken(), []);

  const value = useMemo<AuthContextValue>(() => ({
    state,
    user: state.status === 'authenticated' ? state.user : null,
    isAuthenticated: state.status === 'authenticated',
    isLoading: state.status === 'loading',
    householdInitialized: state.status !== 'uninitialized',
    login,
    logout,
    getSessionToken,
  }), [state, login, logout, getSessionToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('Auth context is not available.');
  }
  return context;
}
