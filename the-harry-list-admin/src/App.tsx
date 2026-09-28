import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated } from '@azure/msal-react';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { Layout } from './components/Layout';
import { useGroupAuthorization } from './lib/useGroupAuthorization';
import { isE2E } from './lib/e2eAuth';
import { ThemeProvider } from 'the-harry-list-shared';
import { RoleProvider } from './lib/RoleContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2, ShieldX } from 'lucide-react';

// Every page except the Dashboard (the landing page) and Login loads on demand, in its own chunk,
// so the first download only contains what the first screen needs. Layout shows a spinner while a
// page chunk loads.
const ReservationsPage = lazy(() => import('./pages/ReservationsPage').then((mod) => ({ default: mod.ReservationsPage })));
const ReservationDetailPage = lazy(() => import('./pages/ReservationDetailPage').then((mod) => ({ default: mod.ReservationDetailPage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((mod) => ({ default: mod.CalendarPage })));
const ExportPage = lazy(() => import('./pages/ExportPage').then((mod) => ({ default: mod.ExportPage })));
const EmailTemplatesPage = lazy(() => import('./pages/EmailTemplatesPage').then((mod) => ({ default: mod.EmailTemplatesPage })));
const SettingsPage = lazy(() => import('./pages/FormSettingsPage').then((mod) => ({ default: mod.SettingsPage })));
const CalendarAppointmentsPage = lazy(() => import('./pages/CalendarAppointmentsPage').then((mod) => ({ default: mod.CalendarAppointmentsPage })));
const WeekOverviewPage = lazy(() => import('./pages/WeekOverviewPage').then((mod) => ({ default: mod.WeekOverviewPage })));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage').then((mod) => ({ default: mod.AuditLogPage })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isMsalAuthenticated = useIsAuthenticated();
  const { isLoading: isCheckingGroup, isAuthorized, error: groupError } = useGroupAuthorization();

  // e2e runs bypass MSAL/group checks; backend RBAC still applies via X-Test-* headers.
  const e2e = isE2E();
  const isAuthenticated = isMsalAuthenticated || e2e;

  // Show loading while checking group membership
  if (isAuthenticated && !e2e && isCheckingGroup) {
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
  if (isAuthenticated && !e2e && !isAuthorized) {
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
          <button
            onClick={() => {
              sessionStorage.clear();
              window.location.href = '/login';
            }}
            className="inline-block px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors"
          >
            Sign out and try again
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
    <RoleProvider>
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
          <Route path="week-overview" element={<WeekOverviewPage />} />
          <Route path="reservations/:id" element={<ReservationDetailPage />} />
          <Route path="export" element={<ExportPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="email-templates" element={<EmailTemplatesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="form-settings" element={<SettingsPage />} />
          <Route path="calendar-appointments" element={<CalendarAppointmentsPage />} />
          <Route path="audit" element={<AuditLogPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </RoleProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
