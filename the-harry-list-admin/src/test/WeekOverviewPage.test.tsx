import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { WeekOverviewPage } from '../pages/WeekOverviewPage';

// Hoist mock data so vi.mock factory can access it
const { mockFetchReservations, mockUpdateCateringArranged, testData } = vi.hoisted(() => {
  // Compute dates inside hoisted scope
  function _getMonday(): Date {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function _fmt(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function _addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  const mon = _getMonday();
  const tue = _addDays(mon, 1);
  const wed = _addDays(mon, 2);
  const lastWeek = _addDays(mon, -7);

  const reservations = [
    {
      id: 1,
      eventTitle: 'Hubble Birthday',
      contactName: 'John Doe',
      email: 'john@example.com',
      status: 'PENDING',
      eventDate: _fmt(mon),
      startTime: '14:00:00',
      endTime: '17:00:00',
      location: 'HUBBLE',
      expectedGuests: 25,
      specialActivities: ['EAT_CATERING'],
      cateringArranged: false,
    },
    {
      id: 2,
      eventTitle: 'Meteor Meeting',
      contactName: 'Jane Smith',
      email: 'jane@example.com',
      status: 'CONFIRMED',
      eventDate: _fmt(tue),
      startTime: '10:00:00',
      endTime: '12:00:00',
      location: 'METEOR',
      expectedGuests: 10,
      confirmationNumber: 'ABC123',
      specialActivities: [],
      cateringArranged: false,
    },
    {
      id: 3,
      eventTitle: 'Wednesday Workshop',
      contactName: 'Bob Wilson',
      email: 'bob@example.com',
      status: 'CONFIRMED',
      eventDate: _fmt(wed),
      startTime: '09:00:00',
      endTime: '11:00:00',
      location: 'HUBBLE',
      expectedGuests: 30,
      specialActivities: ['EAT_A_LA_CARTE'],
      cateringArranged: true,
    },
    {
      id: 4,
      eventTitle: 'Last Week Event',
      contactName: 'Past Person',
      email: 'past@example.com',
      status: 'COMPLETED',
      eventDate: _fmt(lastWeek),
      startTime: '10:00:00',
      endTime: '12:00:00',
      location: 'HUBBLE',
      expectedGuests: 5,
      specialActivities: [],
      cateringArranged: false,
    },
  ];

  return {
    mockFetchReservations: vi.fn().mockResolvedValue(reservations),
    mockUpdateCateringArranged: vi.fn().mockResolvedValue({ cateringArranged: true }),
    testData: { reservations },
  };
});

vi.mock('../lib/api', () => ({
  fetchReservations: mockFetchReservations,
  updateCateringArranged: mockUpdateCateringArranged,
}));

const renderPage = () => {
  return render(
    <BrowserRouter>
      <WeekOverviewPage />
    </BrowserRouter>
  );
};

describe('WeekOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchReservations.mockResolvedValue(testData.reservations);
    mockUpdateCateringArranged.mockResolvedValue({ cateringArranged: true });
  });

  it('renders the page title after loading', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Week Overview')).toBeInTheDocument();
    });
  });

  it('displays reservations for the current week', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Hubble Birthday')).toBeInTheDocument();
      expect(screen.getByText('Meteor Meeting')).toBeInTheDocument();
      expect(screen.getByText('Wednesday Workshop')).toBeInTheDocument();
    });
  });

  it('does not display reservations from other weeks', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Hubble Birthday')).toBeInTheDocument();
    });
    expect(screen.queryByText('Last Week Event')).not.toBeInTheDocument();
  });

  it('shows summary stats', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument();
      // "Pending" / "Confirmed" appear in both the stats and the status filter,
      // so just check the stat labels exist at least once
      expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Confirmed').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Catering to arrange')).toBeInTheDocument();
    });
  });

  it('shows catering to arrange count', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Catering to arrange')).toBeInTheDocument();
    });
  });

  it('shows all 7 day columns', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Mon')).toBeInTheDocument();
    });
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });

  it('has week navigation buttons', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
    });
  });

  it('filters by location when Hubble is selected', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Hubble Birthday')).toBeInTheDocument();
    });

    const locationSelect = screen.getByDisplayValue('All Locations');
    fireEvent.change(locationSelect, { target: { value: 'HUBBLE' } });

    await waitFor(() => {
      expect(screen.getByText('Hubble Birthday')).toBeInTheDocument();
      expect(screen.getByText('Wednesday Workshop')).toBeInTheDocument();
      expect(screen.queryByText('Meteor Meeting')).not.toBeInTheDocument();
    });
  });

  it('filters by location when Meteor is selected', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Meteor Meeting')).toBeInTheDocument();
    });

    const locationSelect = screen.getByDisplayValue('All Locations');
    fireEvent.change(locationSelect, { target: { value: 'METEOR' } });

    await waitFor(() => {
      expect(screen.getByText('Meteor Meeting')).toBeInTheDocument();
      expect(screen.queryByText('Hubble Birthday')).not.toBeInTheDocument();
      expect(screen.queryByText('Wednesday Workshop')).not.toBeInTheDocument();
    });
  });

  it('shows location badges on reservation cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Hubble Birthday')).toBeInTheDocument();
    });
    expect(screen.getAllByText('HUBBLE').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('METEOR').length).toBeGreaterThanOrEqual(1);
  });

  it('shows time on reservation cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Hubble Birthday')).toBeInTheDocument();
    });
    expect(screen.getByText(/14:00.*17:00/)).toBeInTheDocument();
    expect(screen.getByText(/10:00.*12:00/)).toBeInTheDocument();
  });

  it('toggles catering arranged on click', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Hubble Birthday')).toBeInTheDocument();
    });

    const cateringButtons = screen.getAllByTitle(/[Cc]atering/);
    const unarrangedButton = cateringButtons.find(btn => btn.getAttribute('title')?.includes('needed'));
    expect(unarrangedButton).toBeTruthy();

    fireEvent.click(unarrangedButton!);

    await waitFor(() => {
      expect(mockUpdateCateringArranged).toHaveBeenCalledWith(1, true);
    });
  });

  it('shows status badges on reservation cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Hubble Birthday')).toBeInTheDocument();
    });
    // Each card should have a visible status badge
    expect(screen.getAllByText('PENDING').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('CONFIRMED').length).toBeGreaterThanOrEqual(1);
  });

  it('filters by status when Pending is selected', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Hubble Birthday')).toBeInTheDocument();
    });

    const statusSelect = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusSelect, { target: { value: 'PENDING' } });

    await waitFor(() => {
      expect(screen.getByText('Hubble Birthday')).toBeInTheDocument();
      expect(screen.queryByText('Meteor Meeting')).not.toBeInTheDocument();
      expect(screen.queryByText('Wednesday Workshop')).not.toBeInTheDocument();
    });
  });

  it('filters by status when Confirmed is selected', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Meteor Meeting')).toBeInTheDocument();
    });

    const statusSelect = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusSelect, { target: { value: 'CONFIRMED' } });

    await waitFor(() => {
      expect(screen.getByText('Meteor Meeting')).toBeInTheDocument();
      expect(screen.getByText('Wednesday Workshop')).toBeInTheDocument();
      expect(screen.queryByText('Hubble Birthday')).not.toBeInTheDocument();
    });
  });

  it('combines status and location filters', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Hubble Birthday')).toBeInTheDocument();
    });

    // Filter to CONFIRMED + HUBBLE => only Wednesday Workshop
    const statusSelect = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusSelect, { target: { value: 'CONFIRMED' } });
    const locationSelect = screen.getByDisplayValue('All Locations');
    fireEvent.change(locationSelect, { target: { value: 'HUBBLE' } });

    await waitFor(() => {
      expect(screen.getByText('Wednesday Workshop')).toBeInTheDocument();
      expect(screen.queryByText('Hubble Birthday')).not.toBeInTheDocument();
      expect(screen.queryByText('Meteor Meeting')).not.toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    mockFetchReservations.mockRejectedValueOnce(new Error('Network error'));

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
