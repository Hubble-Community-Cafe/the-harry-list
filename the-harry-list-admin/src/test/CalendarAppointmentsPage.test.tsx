import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CalendarAppointmentsPage } from '../pages/CalendarAppointmentsPage';

const { mockFetch, mockCreate, mockUpdate, mockToggle, mockDelete, mockUsePermissions } = vi.hoisted(() => {
  return {
    mockFetch: vi.fn(),
    mockCreate: vi.fn(),
    mockUpdate: vi.fn(),
    mockToggle: vi.fn(),
    mockDelete: vi.fn(),
    mockUsePermissions: vi.fn(),
  };
});

const allPermissions = {
  canUpdateReservations: true,
  canManageBlockedPeriods: true,
  canManageAppointments: true,
  canManageAttachments: true,
  canEditEmailTemplates: true,
  canEditFormSettings: true,
  canManageUsers: true,
};

const viewerPermissions = {
  canUpdateReservations: false,
  canManageBlockedPeriods: false,
  canManageAppointments: false,
  canManageAttachments: false,
  canEditEmailTemplates: false,
  canEditFormSettings: false,
  canManageUsers: false,
};

vi.mock('../lib/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}));

vi.mock('../lib/api', () => ({
  fetchCalendarAppointments: mockFetch,
  createCalendarAppointment: mockCreate,
  updateCalendarAppointment: mockUpdate,
  toggleCalendarAppointment: mockToggle,
  deleteCalendarAppointment: mockDelete,
}));

const sampleAppointments = [
  {
    id: 1,
    title: 'Staff Meeting',
    description: 'Weekly team sync',
    date: '2026-06-01',
    allDay: false,
    startTime: '10:00:00',
    endTime: '11:00:00',
    location: 'HUBBLE',
    recurrenceType: 'WEEKLY',
    recurrenceEndDate: '2026-12-31',
    enabled: true,
  },
  {
    id: 2,
    title: 'Holiday Closure',
    date: '2026-12-25',
    allDay: true,
    location: 'METEOR',
    recurrenceType: 'NONE',
    enabled: false,
  },
];

const renderPage = () => {
  return render(
    <BrowserRouter>
      <CalendarAppointmentsPage />
    </BrowserRouter>
  );
};

describe('CalendarAppointmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(sampleAppointments);
    mockUsePermissions.mockReturnValue(allPermissions);
  });

  it('renders page title', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Calendar Appointments')).toBeInTheDocument();
    });
  });

  it('shows appointment titles after loading', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Staff Meeting')).toBeInTheDocument();
      expect(screen.getByText('Holiday Closure')).toBeInTheDocument();
    });
  });

  it('shows location badges', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('HUBBLE')).toBeInTheDocument();
      expect(screen.getByText('METEOR')).toBeInTheDocument();
    });
  });

  it('shows recurrence badge for recurring appointments', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Weekly')).toBeInTheDocument();
    });
  });

  it('shows All day badge for all-day appointments', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('All day')).toBeInTheDocument();
    });
  });

  it('shows time range for timeboxed appointments', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('10:00–11:00')).toBeInTheDocument();
    });
  });

  it('opens create modal on Add Appointment click', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Staff Meeting')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add Appointment'));
    expect(screen.getByText('New Appointment')).toBeInTheDocument();
  });

  it('opens edit modal when edit button clicked', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Staff Meeting')).toBeInTheDocument();
    });
    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);
    expect(screen.getByText('Edit Appointment')).toBeInTheDocument();
  });

  it('shows empty state when no appointments', async () => {
    mockFetch.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/No appointments yet/)).toBeInTheDocument();
    });
  });

  it('hides time fields when all-day is toggled', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Staff Meeting')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add Appointment'));

    // By default, time fields should be visible
    expect(screen.getByText('Start Time *')).toBeInTheDocument();
    expect(screen.getByText('End Time *')).toBeInTheDocument();

    // Toggle all-day by clicking the toggle button (the parent of the icon, sibling of the text)
    const allDayText = screen.getByText('All-day event');
    const toggleButton = allDayText.previousElementSibling as HTMLElement;
    fireEvent.click(toggleButton);

    // Time fields should be hidden
    expect(screen.queryByText('Start Time *')).not.toBeInTheDocument();
    expect(screen.queryByText('End Time *')).not.toBeInTheDocument();
  });

  it('shows recurrence end date field when recurrence is set', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Staff Meeting')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add Appointment'));

    // By default (NONE), no end date field
    expect(screen.queryByText('Recurrence End Date')).not.toBeInTheDocument();

    // Change recurrence to Weekly
    const recurrenceSelect = screen.getByDisplayValue('Does not repeat');
    fireEvent.change(recurrenceSelect, { target: { value: 'WEEKLY' } });

    expect(screen.getByText('Recurrence End Date')).toBeInTheDocument();
  });

  it('calls toggle when toggle button clicked', async () => {
    mockToggle.mockResolvedValue({ ...sampleAppointments[0], enabled: false });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Staff Meeting')).toBeInTheDocument();
    });
    const toggleButtons = screen.getAllByTitle('Disable');
    fireEvent.click(toggleButtons[0]);
    await waitFor(() => {
      expect(mockToggle).toHaveBeenCalledWith(1);
    });
  });

  it('calls delete when delete button clicked and confirmed in dialog', async () => {
    mockDelete.mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Staff Meeting')).toBeInTheDocument();
    });
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    // Confirmation dialog should appear
    expect(screen.getByText('Delete appointment')).toBeInTheDocument();
    expect(screen.getByText(/permanently deleted/)).toBeInTheDocument();

    // Confirm the deletion
    fireEvent.click(screen.getByText('Delete', { selector: 'button' }));
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(1);
    });
  });

  // ── Guided recurrence builder ───────────────────────────────────────────────

  const dateInputs = () => Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];

  const startNewAllDayAppointment = (title: string, date: string) => {
    fireEvent.click(screen.getByText('Add Appointment'));
    fireEvent.change(screen.getByPlaceholderText(/Staff Meeting/), { target: { value: title } });
    fireEvent.change(dateInputs()[0], { target: { value: date } });
    // all-day so we don't need start/end times to enable the submit button
    fireEvent.click(screen.getByText('All-day event').previousElementSibling as HTMLElement);
  };

  it('saves an "every N weeks" interval', async () => {
    mockCreate.mockResolvedValue({ id: 9, title: 'Sprint Sync', date: '2026-06-01', allDay: true, location: 'HUBBLE', recurrenceType: 'WEEKLY', recurrenceInterval: 3, enabled: true });
    renderPage();
    await waitFor(() => expect(screen.getByText('Staff Meeting')).toBeInTheDocument());

    startNewAllDayAppointment('Sprint Sync', '2026-06-01');
    fireEvent.change(screen.getByDisplayValue('Does not repeat'), { target: { value: 'WEEKLY' } });
    fireEvent.change(screen.getByLabelText('Repeat interval'), { target: { value: '3' } });
    fireEvent.click(screen.getByText('Create Appointment'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    const payload = mockCreate.mock.calls[0][0];
    expect(payload.recurrenceType).toBe('WEEKLY');
    expect(payload.recurrenceInterval).toBe(3);
  });

  it('saves a "monthly on the Nth weekday" pattern', async () => {
    mockCreate.mockResolvedValue({ id: 10, title: '2nd Friday Drinks', date: '2026-06-12', allDay: true, location: 'HUBBLE', recurrenceType: 'MONTHLY_NTH_WEEKDAY', recurrenceWeekOfMonth: 2, recurrenceDayOfWeek: 'FRIDAY', enabled: true });
    renderPage();
    await waitFor(() => expect(screen.getByText('Staff Meeting')).toBeInTheDocument());

    startNewAllDayAppointment('2nd Friday Drinks', '2026-06-12');
    fireEvent.change(screen.getByDisplayValue('Does not repeat'), { target: { value: 'MONTHLY' } });

    // Switch to the "on the Nth weekday" mode
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[1]);
    fireEvent.change(screen.getByLabelText('Week of month'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Day of week'), { target: { value: 'FRIDAY' } });

    fireEvent.click(screen.getByText('Create Appointment'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    const payload = mockCreate.mock.calls[0][0];
    expect(payload.recurrenceType).toBe('MONTHLY_NTH_WEEKDAY');
    expect(payload.recurrenceWeekOfMonth).toBe(2);
    expect(payload.recurrenceDayOfWeek).toBe('FRIDAY');
  });

  it('renders a descriptive badge for nth-weekday recurrence', async () => {
    mockFetch.mockResolvedValue([
      { id: 7, title: 'Board Meeting', date: '2026-06-12', allDay: true, location: 'HUBBLE', recurrenceType: 'MONTHLY_NTH_WEEKDAY', recurrenceWeekOfMonth: 2, recurrenceDayOfWeek: 'FRIDAY', enabled: true },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Board Meeting')).toBeInTheDocument());
    expect(screen.getByText('Every 2nd Friday')).toBeInTheDocument();
  });

  it('opens a legacy BIWEEKLY appointment as "Weekly, every 2 weeks" and saves it equivalently', async () => {
    mockFetch.mockResolvedValue([
      { id: 8, title: 'Legacy Biweekly', date: '2026-06-01', allDay: true, location: 'HUBBLE', recurrenceType: 'BIWEEKLY', enabled: true },
    ]);
    mockUpdate.mockResolvedValue({ id: 8, title: 'Legacy Biweekly', date: '2026-06-01', allDay: true, location: 'HUBBLE', recurrenceType: 'WEEKLY', recurrenceInterval: 2, enabled: true });
    renderPage();
    await waitFor(() => expect(screen.getByText('Legacy Biweekly')).toBeInTheDocument());

    // List badge still reads the legacy label
    expect(screen.getByText('Bi-weekly')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Edit'));
    // Presented as Weekly with interval 2
    expect(screen.getByDisplayValue('Weekly')).toBeInTheDocument();
    expect(screen.getByLabelText('Repeat interval')).toHaveValue(2);

    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    const [id, payload] = mockUpdate.mock.calls[0];
    expect(id).toBe(8);
    expect(payload.recurrenceType).toBe('WEEKLY');
    expect(payload.recurrenceInterval).toBe(2);
  });
});

describe('CalendarAppointmentsPage - viewer permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(sampleAppointments);
    mockUsePermissions.mockReturnValue(viewerPermissions);
  });

  it('hides Add Appointment button for viewer', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Staff Meeting')).toBeInTheDocument();
    });
    expect(screen.queryByText('Add Appointment')).not.toBeInTheDocument();
  });

  it('hides edit, toggle, and delete buttons for viewer', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Staff Meeting')).toBeInTheDocument();
    });
    expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Disable')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Enable')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
  });

  it('still shows appointment data for viewer', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Staff Meeting')).toBeInTheDocument();
      expect(screen.getByText('Holiday Closure')).toBeInTheDocument();
      expect(screen.getByText('HUBBLE')).toBeInTheDocument();
      expect(screen.getByText('METEOR')).toBeInTheDocument();
    });
  });
});
