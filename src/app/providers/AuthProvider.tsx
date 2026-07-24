import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { config } from '../config';

interface AuthContextValue {
  authenticated: boolean;
  loading: boolean;
  login(password: string): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (config.VITE_USE_MOCK_DATA) {
      setAuthenticated(sessionStorage.getItem('grand-line-vault:mock-session') === 'active');
      setLoading(false);
      return;
    }
    fetch('/api/auth/session')
      .then((response) => setAuthenticated(response.ok))
      .catch(() => setAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      authenticated,
      loading,
      async login(password: string) {
        if (config.VITE_USE_MOCK_DATA) {
          if (password !== 'nakama') throw new Error('Credenciales incorrectas.');
          sessionStorage.setItem('grand-line-vault:mock-session', 'active');
          setAuthenticated(true);
          return;
        }
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        if (!response.ok) throw new Error('Credenciales incorrectas.');
        setAuthenticated(true);
      },
      async logout() {
        if (config.VITE_USE_MOCK_DATA) {
          sessionStorage.removeItem('grand-line-vault:mock-session');
        } else {
          await fetch('/api/auth/logout', { method: 'POST' });
        }
        setAuthenticated(false);
      },
    }),
    [authenticated, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider no está configurado.');
  return value;
}
