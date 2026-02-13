import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ReservationsPage } from '../pages/ReservationsPage';

// Mock the API
vi.mock('../lib/api', () => ({
  fetchReservations: vi.fn().mockResolvedValue([
    {
      id: 1,
      eventTitle: 'Birthday Party',
      contactName: 'John Doe',
      email: 'john@example.com',
      status: 'PENDING',
      eventDate: '2026-02-20',
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
      eventDate: '2026-02-21',
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
      eventDate: '2026-02-15',
      startTime: '09:00:00',
      endTime: '11:00:00',
      location: 'HUBBLE',
      expectedGuests: 30,
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
});

