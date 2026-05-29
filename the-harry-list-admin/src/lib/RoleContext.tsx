import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useIsAuthenticated } from '@azure/msal-react';
import { fetchCurrentUser, type AdminUser } from './api';

type AdminRole = 'VIEWER' | 'EDITOR' | 'ADMIN';

interface RoleContextValue {
  user: AdminUser | null;
  role: AdminRole | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const RoleContext = createContext<RoleContextValue>({
  user: null,
  role: null,
  isLoading: true,
  error: null,
  refetch: () => {},
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRole = async () => {
    if (!isAuthenticated) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch (e) {
      console.error('Failed to fetch current user role:', e);
      setError('Failed to load user role');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRole();

    // Re-fetch when MSAL account changes (login/redirect)
    const handleAccountChanged = () => fetchRole();
    window.addEventListener('msal:accountChanged', handleAccountChanged);
    return () => window.removeEventListener('msal:accountChanged', handleAccountChanged);
  }, [isAuthenticated]);

  return (
    <RoleContext.Provider value={{
      user,
      role: user?.role as AdminRole | null,
      isLoading,
      error,
      refetch: fetchRole,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
