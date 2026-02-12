import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated } from '@azure/msal-react';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReservationsPage } from './pages/ReservationsPage';
import { ReservationDetailPage } from './pages/ReservationDetailPage';
import { Layout } from './components/Layout';
import { hasApiCredentials, isDevMode, isDevAuthenticated } from './lib/api';
import { useGroupAuthorization } from './lib/useGroupAuthorization';
import { Loader2, ShieldX } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isMsalAuthenticated = useIsAuthenticated();
  const hasCredentials = hasApiCredentials();
  const { isLoading: isCheckingGroup, isAuthorized, error: groupError } = useGroupAuthorization();

  // In dev mode, we can bypass Microsoft auth if dev authenticated
  const isAuthenticated = isDevMode()
    ? (isDevAuthenticated() || isMsalAuthenticated)
    : isMsalAuthenticated;

  // Show loading while checking group membership
  if (isAuthenticated && isCheckingGroup) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-hubble-400 animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized message if user is not in the allowed group
  if (isAuthenticated && !isAuthorized && !isDevMode()) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-900 border border-dark-800 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-dark-400 mb-6">
            {groupError || 'You are not authorized to access this application. Please contact an administrator to request access.'}
          </p>
          <a
            href="/"
            onClick={() => {
              sessionStorage.clear();
              window.location.href = '/login';
            }}
            className="inline-block px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors"
          >
            Sign out and try again
          </a>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !hasCredentials) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="reservations/:id" element={<ReservationDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

