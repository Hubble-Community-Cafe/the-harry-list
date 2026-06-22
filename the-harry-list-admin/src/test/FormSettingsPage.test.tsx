import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { FormSettingsPage } from '../pages/FormSettingsPage';
import { fetchBlockedPeriods, createFormConstraint } from '../lib/api';

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

  it('hides the target value field and saves an Activity Notice constraint', async () => {
    vi.mocked(createFormConstraint).mockResolvedValueOnce({
      id: 9,
      constraintType: 'ACTIVITY_NOTICE',
      triggerActivity: 'PRIVATE_EVENT',
      message: 'A private event at Meteor has an additional charge.',
      enabled: true,
    });

    renderWithRouter(<FormSettingsPage />);
    await waitFor(() => expect(screen.getByText('Add Constraint')).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByText('Add Constraint'));
    await waitFor(() => expect(screen.getByText('New Constraint')).toBeInTheDocument());

    // Target Value is shown for the default (Activity Conflict) type.
    expect(screen.getByTestId('constraint-target')).toBeInTheDocument();

    // Switching to Activity Notice hides the target value field — only trigger + message remain.
    fireEvent.change(screen.getByTestId('constraint-type'), { target: { value: 'ACTIVITY_NOTICE' } });
    expect(screen.queryByTestId('constraint-target')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('constraint-trigger'), { target: { value: 'PRIVATE_EVENT' } });
    fireEvent.change(screen.getByTestId('constraint-message'), {
      target: { value: 'A private event at Meteor has an additional charge.' },
    });
    fireEvent.click(screen.getByTestId('save-constraint'));

    await waitFor(() => expect(createFormConstraint).toHaveBeenCalled());
    expect(vi.mocked(createFormConstraint).mock.calls[0][0]).toMatchObject({
      constraintType: 'ACTIVITY_NOTICE',
      triggerActivity: 'PRIVATE_EVENT',
      message: 'A private event at Meteor has an additional charge.',
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

  it('reveals the acknowledgement text field when soft block is toggled on', async () => {
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

    // Acknowledgement field hidden until soft block is enabled
    expect(screen.queryByText(/Acknowledgement text/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Toggle soft block'));

    expect(await screen.findByText(/Acknowledgement text/i)).toBeInTheDocument();
  });

  it('shows a "Soft block" badge for soft-blocked periods', async () => {
    vi.mocked(fetchBlockedPeriods).mockResolvedValueOnce([
      {
        id: 1,
        startDate: '2026-07-01',
        endDate: '2026-08-31',
        reason: 'Summer closing',
        publicMessage: 'Bar open on request only',
        softBlock: true,
        acknowledgementText: 'I understand the bar may be closed',
        enabled: true,
      },
    ]);

    renderWithRouter(<FormSettingsPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Blocked Periods/).length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    const blockedBtn = screen.getAllByText(/Blocked Periods/).find(el => el.closest('button'));
    fireEvent.click(blockedBtn!);

    await waitFor(() => {
      expect(screen.getByText('Summer closing')).toBeInTheDocument();
      expect(screen.getByText('Soft block')).toBeInTheDocument();
    });
  });

  it('clears an optional blocked-period time via the clear button', async () => {
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

    const startTime = document.querySelector('input[type="time"]') as HTMLInputElement;
    expect(startTime).toBeTruthy();

    // No clear button while the time is empty
    expect(screen.queryByLabelText('Clear start time')).not.toBeInTheDocument();

    // Setting a value reveals the clear button
    fireEvent.change(startTime, { target: { value: '10:30' } });
    expect(startTime.value).toBe('10:30');

    const clearBtn = await screen.findByLabelText('Clear start time');
    fireEvent.click(clearBtn);

    // Time is cleared and the clear button disappears again
    await waitFor(() => {
      expect((document.querySelector('input[type="time"]') as HTMLInputElement).value).toBe('');
    });
    expect(screen.queryByLabelText('Clear start time')).not.toBeInTheDocument();
  });
});
