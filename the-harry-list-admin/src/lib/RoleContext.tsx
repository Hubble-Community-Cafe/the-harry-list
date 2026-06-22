import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useIsAuthenticated } from '@azure/msal-react';
import { fetchCurrentUser, type AdminUser } from './api';
import { isE2E } from './e2eAuth';

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

// eslint-disable-next-line react-refresh/only-export-components
export function useRole() {
  return useContext(RoleContext);
}

// Retry the role fetch a few times before giving up. A single transient failure used to
// leave role=null permanently (the provider only refetched on msal:accountChanged), which
// silently hid role-gated UI like the "Add appointment" button until a full page reload.
const ROLE_FETCH_ATTEMPTS = 3;

async function fetchCurrentUserWithRetry(): Promise<AdminUser> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= ROLE_FETCH_ATTEMPTS; attempt++) {
    try {
      return await fetchCurrentUser();
    } catch (e) {
      lastError = e;
      if (attempt < ROLE_FETCH_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
  }
  throw lastError;
}

export function RoleProvider({ children }: { children: ReactNode }) {
  // e2e runs aren't MSAL-authenticated but should still load their role from the backend.
  const isAuthenticated = useIsAuthenticated() || isE2E();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bumping this re-runs the load effect — used by refetch() and msal:accountChanged.
  const [reloadCounter, setReloadCounter] = useState(0);

  const refetch = useCallback(() => setReloadCounter(c => c + 1), []);

  // State is only set inside async callbacks (not synchronously in the effect body),
  // to satisfy the react-hooks/set-state-in-effect rule. `isLoading` starts true.
  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated) {
      Promise.resolve().then(() => {
        if (cancelled) return;
        setUser(null);
        setIsLoading(false);
      });
      return () => { cancelled = true; };
    }

    fetchCurrentUserWithRetry()
      .then(currentUser => {
        if (cancelled) return;
        setUser(currentUser);
        setError(null);
      })
      .catch(e => {
        console.error('Failed to fetch current user role:', e);
        if (!cancelled) setError('Failed to load user role');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    // Re-fetch when MSAL account changes (login/redirect).
    const handleAccountChanged = () => refetch();
    window.addEventListener('msal:accountChanged', handleAccountChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('msal:accountChanged', handleAccountChanged);
    };
  }, [isAuthenticated, reloadCounter, refetch]);

  return (
    <RoleContext.Provider value={{
      user,
      role: user?.role as AdminRole | null,
      isLoading,
      error,
      refetch,
    }}>
      {children}
    </RoleContext.Provider>
  );
}
