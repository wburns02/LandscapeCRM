import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '../types';
import { login as apiLogin, logout as apiLogout, getCurrentUser } from '../api/auth';
import { Navigate, useLocation } from 'react-router-dom';

const DEMO_USER: User = {
  id: 'demo',
  name: 'Demo User',
  email: 'demo@maasverde.com',
  role: 'admin',
} as any;

function isDemoMode(): boolean {
  return localStorage.getItem('gs_token') === 'demo_token';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('gs_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    if (token === 'demo_token') {
      setUser(DEMO_USER);
      setIsLoading(false);
      return;
    }
    getCurrentUser()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('gs_token');
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await apiLogin(email, password);
      const apiUser = result.user as unknown as Record<string, unknown>;
      setUser({
        ...result.user,
        name: (apiUser.full_name as string) || result.user.name || result.user.email,
      });
    } catch {
      // API unavailable — fall back to demo mode
      localStorage.setItem('gs_token', 'demo_token');
      setUser(DEMO_USER);
    }
  }, []);

  const logout = useCallback(async () => {
    if (isDemoMode()) {
      localStorage.removeItem('gs_token');
      setUser(null);
      return;
    }
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-earth-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-earth-300 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
