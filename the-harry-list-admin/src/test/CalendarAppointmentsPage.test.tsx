import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CalendarAppointmentsPage } from '../pages/CalendarAppointmentsPage';

const { mockFetch, mockCreate, mockUpdate, mockToggle, mockDelete } = vi.hoisted(() => {
  return {
    mockFetch: vi.fn(),
    mockCreate: vi.fn(),
    mockUpdate: vi.fn(),
    mockToggle: vi.fn(),
    mockDelete: vi.fn(),
  };
});

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
    const recurrenceSelect = screen.getByDisplayValue('None');
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

  it('calls delete when delete button clicked', async () => {
    mockDelete.mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Staff Meeting')).toBeInTheDocument();
    });
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(1);
    });
  });
});
