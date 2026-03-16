import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ReservationsPage } from '../pages/ReservationsPage';

function dateOffset(monthOffset: number, dayOffset = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset);
  d.setDate(d.getDate() + dayOffset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Mock the API
vi.mock('../lib/api', () => ({
  fetchReservations: vi.fn().mockResolvedValue([
    {
      id: 1,
      eventTitle: 'Birthday Party',
      contactName: 'John Doe',
      email: 'john@example.com',
      status: 'PENDING',
      eventDate: dateOffset(1, 0),
      startTime: '14:00:00',
      endTime: '17:00:00',
      location: 'HUBBLE',
      expectedGuests: 25,
      organizationName: 'Test Org',
    },
    {
      id: 2,
      eventTitle: 'Team Meeting',
      contactName: 'Jane Smith',
      email: 'jane@example.com',
      status: 'CONFIRMED',
      eventDate: dateOffset(1, 1),
      startTime: '10:00:00',
      endTime: '12:00:00',
      location: 'METEOR',
      expectedGuests: 10,
      confirmationNumber: 'ABC123',
    },
    {
      id: 3,
      eventTitle: 'Workshop',
      contactName: 'Bob Wilson',
      email: 'bob@example.com',
      status: 'COMPLETED',
      eventDate: dateOffset(1, 2),
      startTime: '09:00:00',
      endTime: '11:00:00',
      location: 'HUBBLE',
      expectedGuests: 30,
    },
    {
      id: 4,
      eventTitle: 'Old Event',
      contactName: 'Past Person',
      email: 'past@example.com',
      status: 'COMPLETED',
      eventDate: dateOffset(-1, 0),
      startTime: '10:00:00',
      endTime: '12:00:00',
      location: 'HUBBLE',
      expectedGuests: 5,
    },
  ]),
}));

const renderWithRouter = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ReservationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the reservations page title after loading', async () => {
    renderWithRouter(<ReservationsPage />);
    await waitFor(() => {
      expect(screen.getByText('Reservations')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays reservations after loading', async () => {
    renderWithRouter(<ReservationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Birthday Party/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows multiple reservations', async () => {
    renderWithRouter(<ReservationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Birthday Party/i)).toBeInTheDocument();
      expect(screen.getByText(/Team Meeting/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays filter options', async () => {
    renderWithRouter(<ReservationsPage />);

    // Should have some form of filtering UI
    await waitFor(() => {
      const filterElements = document.querySelectorAll('select, input, button');
      expect(filterElements.length).toBeGreaterThan(0);
    });
  });

  it('hides past reservations by default', async () => {
    renderWithRouter(<ReservationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Birthday Party/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Old Event/i)).not.toBeInTheDocument();
  });

  it('shows past reservations when Show past is checked', async () => {
    renderWithRouter(<ReservationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Birthday Party/i)).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox', { name: /show past/i });
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.getByText(/Old Event/i)).toBeInTheDocument();
    });
  });
});

