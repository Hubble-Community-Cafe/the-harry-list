import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { FormSettingsPage } from '../pages/FormSettingsPage';

vi.mock('../lib/usePermissions', () => ({
  usePermissions: () => ({
    canUpdateReservations: true,
    canManageBlockedPeriods: true,
    canManageAppointments: true,
    canManageAttachments: true,
    canEditEmailTemplates: true,
    canEditFormSettings: true,
    canManageUsers: true,
  }),
}));

vi.mock('../lib/RoleContext', () => ({
  useRole: () => ({
    role: 'ADMIN',
    user: { id: 1, azureOid: 'test', email: 'test@test.com', displayName: 'Test', role: 'ADMIN' },
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

// Mock the API
vi.mock('../lib/api', () => ({
  fetchFormConstraints: vi.fn().mockResolvedValue([
    {
      id: 1,
      constraintType: 'ACTIVITY_CONFLICT',
      triggerActivity: 'EAT_CATERING',
      targetValue: 'EAT_A_LA_CARTE',
      message: 'Catering and à la carte cannot be combined',
      enabled: true,
    },
    {
      id: 2,
      constraintType: 'LOCATION_LOCK',
      triggerActivity: 'CATERING_CORONA_ROOM',
      targetValue: 'HUBBLE',
      message: 'Corona Room is only at Hubble',
      enabled: true,
    },
    {
      id: 3,
      constraintType: 'ADVANCE_BOOKING',
      triggerActivity: 'EAT_CATERING',
      numericValue: 7,
      message: 'Catering requires 7 days advance',
      enabled: false,
    },
  ]),
  fetchBlockedPeriods: vi.fn().mockResolvedValue([
    {
      id: 1,
      location: 'HUBBLE',
      startDate: '2026-04-01',
      endDate: '2026-04-03',
      reason: 'Spring maintenance',
      publicMessage: 'Closed for maintenance',
      enabled: true,
    },
  ]),
  toggleFormConstraint: vi.fn().mockResolvedValue({
    id: 1,
    constraintType: 'ACTIVITY_CONFLICT',
    triggerActivity: 'EAT_CATERING',
    targetValue: 'EAT_A_LA_CARTE',
    message: 'Catering and à la carte cannot be combined',
    enabled: false,
  }),
  deleteFormConstraint: vi.fn().mockResolvedValue(undefined),
  createFormConstraint: vi.fn(),
  updateFormConstraint: vi.fn(),
  toggleBlockedPeriod: vi.fn(),
  deleteBlockedPeriod: vi.fn(),
  createBlockedPeriod: vi.fn(),
  updateBlockedPeriod: vi.fn(),
  fetchRetentionSettings: vi.fn().mockResolvedValue({
    retentionDays: 365,
    enabled: true,
    eligibleForDeletion: 0,
    nextRunAt: '2026-04-03T02:00:00',
    cutoffDate: '2025-04-02',
  }),
  fetchAllUsers: vi.fn().mockResolvedValue([]),
  updateUserRole: vi.fn(),
}));

const renderWithRouter = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('FormSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', async () => {
    renderWithRouter(<FormSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows loading spinner initially', () => {
    renderWithRouter(<FormSettingsPage />);
    const spinner = document.querySelector('svg[class*="animate-spin"]');
    expect(spinner).toBeInTheDocument();
  });

  it('displays constraints tab with constraint count', async () => {
    renderWithRouter(<FormSettingsPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Form Constraints \(3\)/).length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
  });

  it('displays blocked periods tab with count', async () => {
    renderWithRouter(<FormSettingsPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Blocked Periods \(1\)/).length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });
  });

  it('displays constraint messages after loading', async () => {
    renderWithRouter(<FormSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Catering and à la carte cannot be combined')).toBeInTheDocument();
      expect(screen.getByText('Corona Room is only at Hubble')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows constraint type labels', async () => {
    renderWithRouter(<FormSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Activity Conflict')).toBeInTheDocument();
      expect(screen.getByText('Location Lock')).toBeInTheDocument();
      expect(screen.getByText('Advance Booking')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('switches to blocked periods tab', async () => {
    renderWithRouter(<FormSettingsPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Blocked Periods/).length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    // Click the button tab (not the select option)
    const blockedBtn = screen.getAllByText(/Blocked Periods/).find(el => el.closest('button'));
    fireEvent.click(blockedBtn!);

    await waitFor(() => {
      expect(screen.getByText('Spring maintenance')).toBeInTheDocument();
      expect(screen.getByText(/Closed for maintenance/)).toBeInTheDocument();
    });
  });

  it('shows blocked period date range and location', async () => {
    renderWithRouter(<FormSettingsPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Blocked Periods/).length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    const blockedBtn = screen.getAllByText(/Blocked Periods/).find(el => el.closest('button'));
    fireEvent.click(blockedBtn!);

    await waitFor(() => {
      expect(screen.getByText('2026-04-01 — 2026-04-03')).toBeInTheDocument();
      expect(screen.getByText('HUBBLE')).toBeInTheDocument();
    });
  });

  it('opens the new constraint modal when Add Constraint is clicked', async () => {
    renderWithRouter(<FormSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Add Constraint')).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText('Add Constraint'));

    await waitFor(() => {
      expect(screen.getByText('New Constraint')).toBeInTheDocument();
    });
  });

  it('opens new blocked period modal when Add Blocked Period is clicked', async () => {
    renderWithRouter(<FormSettingsPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Blocked Periods/).length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    const blockedBtn = screen.getAllByText(/Blocked Periods/).find(el => el.closest('button'));
    fireEvent.click(blockedBtn!);

    await waitFor(() => {
      expect(screen.getByText('Add Blocked Period')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Blocked Period'));

    await waitFor(() => {
      expect(screen.getByText('New Blocked Period')).toBeInTheDocument();
    });
  });
});
