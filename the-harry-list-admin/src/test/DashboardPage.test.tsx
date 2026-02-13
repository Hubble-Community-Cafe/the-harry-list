import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';

// Mock the API
vi.mock('../lib/api', () => ({
  fetchReservations: vi.fn().mockResolvedValue([
    {
      id: 1,
      eventTitle: 'Test Event',
      contactName: 'John Doe',
      email: 'john@example.com',
      status: 'PENDING',
      eventDate: '2026-02-20',
      startTime: '14:00:00',
      endTime: '17:00:00',
      location: 'HUBBLE',
      expectedGuests: 20,
    },
    {
      id: 2,
      eventTitle: 'Confirmed Event',
      contactName: 'Jane Smith',
      email: 'jane@example.com',
      status: 'CONFIRMED',
      eventDate: '2026-02-21',
      startTime: '10:00:00',
      endTime: '12:00:00',
      location: 'METEOR',
      expectedGuests: 15,
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

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dashboard content after loading', async () => {
    renderWithRouter(<DashboardPage />);
    await waitFor(() => {
      // Check for any content that appears after loading
      expect(document.body.textContent).toMatch(/pending|confirmed|reservation|overview/i);
    }, { timeout: 3000 });
  });

  it('displays loading spinner initially', () => {
    renderWithRouter(<DashboardPage />);
    // Look for the loading spinner SVG
    const spinner = document.querySelector('svg[class*="animate-spin"]');
    expect(spinner).toBeInTheDocument();
  });

  it('shows reservation statistics after loading', async () => {
    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      // Should show some kind of stats or reservation info
      expect(document.body.textContent).toMatch(/pending|confirmed|reservation/i);
    }, { timeout: 3000 });
  });
});

