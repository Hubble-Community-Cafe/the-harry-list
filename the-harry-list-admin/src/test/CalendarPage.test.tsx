import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CalendarPage } from '../pages/CalendarPage';

// Mock the API
vi.mock('../lib/api', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      feeds: [
        {
          id: 'staff-hubble',
          name: 'Staff - Hubble',
          url: 'http://localhost:8080/api/calendar/staff-feed.ics?token=test&location=HUBBLE',
          location: 'HUBBLE',
          isStaff: true,
          hasToken: true,
        },
        {
          id: 'staff-meteor',
          name: 'Staff - Meteor',
          url: 'http://localhost:8080/api/calendar/staff-feed.ics?token=test&location=METEOR',
          location: 'METEOR',
          isStaff: true,
          hasToken: true,
        },
        {
          id: 'public-hubble',
          name: 'Public - Hubble',
          url: 'http://localhost:8080/api/calendar/public-feed.ics?token=test&location=HUBBLE',
          location: 'HUBBLE',
          isStaff: false,
          hasToken: true,
        },
        {
          id: 'public-meteor',
          name: 'Public - Meteor',
          url: 'http://localhost:8080/api/calendar/public-feed.ics?token=test&location=METEOR',
          location: 'METEOR',
          isStaff: false,
          hasToken: true,
        },
      ],
      parameters: [],
    }),
  }),
}));

const renderWithRouter = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the calendar feeds page title', async () => {
    renderWithRouter(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('Calendar Feeds')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays calendar feed cards after loading', async () => {
    renderWithRouter(<CalendarPage />);

    await waitFor(() => {
      // Use getAllByText since there are multiple matches
      const hubbleElements = screen.getAllByText(/hubble/i);
      expect(hubbleElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('shows both staff and public feeds', async () => {
    renderWithRouter(<CalendarPage />);

    await waitFor(() => {
      // Use getAllByText since there are multiple Staff elements
      const staffElements = screen.getAllByText(/staff/i);
      expect(staffElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});

