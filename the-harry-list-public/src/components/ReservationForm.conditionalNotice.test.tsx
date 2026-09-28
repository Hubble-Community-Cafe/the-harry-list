import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationForm } from './ReservationForm';
import type { FormOptions, FormConstraint } from '../types/reservation';

// Notices limited to a location and/or minimum group size (e.g. "Meteor, a la carte, 8+
// guests: pre-order from the menu"). The unconditional notices live in ReservationForm.test.tsx.

vi.mock('../lib/api', () => ({
  fetchFormOptions: vi.fn(),
  fetchFormConstraints: vi.fn(),
  fetchBlockedPeriods: vi.fn(),
  submitReservation: vi.fn(),
  getAltchaChallengeUrl: vi.fn(() => 'http://localhost:8080/api/public/altcha/challenge'),
}));

vi.mock('altcha', () => ({}));

import { fetchFormOptions, fetchFormConstraints, fetchBlockedPeriods } from '../lib/api';

const PRE_ORDER = 'Groups of 8 or more at Meteor: please send your menu choices in advance.';

const mockOptions: FormOptions = {
  specialActivities: [
    { value: 'GRADUATION', displayName: 'Graduation / PhD Defense' },
    { value: 'EAT_A_LA_CARTE', displayName: 'Eat a la Carte' },
  ],
  invoiceTypes: [],
  locations: [
    { value: 'HUBBLE', displayName: 'Hubble' },
    { value: 'METEOR', displayName: 'Meteor' },
  ],
  paymentOptions: [],
  seatingAreas: [
    { value: 'INSIDE', displayName: 'Inside' },
    { value: 'OUTSIDE', displayName: 'Outside' },
  ],
};

const mockConstraints: FormConstraint[] = [
  {
    id: 20,
    constraintType: 'ACTIVITY_NOTICE',
    triggerActivity: 'EAT_A_LA_CARTE',
    targetValue: 'CONFIRM',
    secondaryValue: 'METEOR',
    numericValue: 8,
    message: PRE_ORDER,
    enabled: true,
  },
];

async function goToStep2(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => {
    expect(screen.queryByText('Loading form options...')).not.toBeInTheDocument();
  });
  await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
  await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await waitFor(() => expect(screen.getByText('Event Details')).toBeInTheDocument());
}

// Set the count in one change: typing "12" key by key passes through 1 guest, which
// locks the location to Meteor on its own.
function setGuests(value: string) {
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value } });
}

const alaCarte = () => screen.getByRole('checkbox', { name: 'Eat a la Carte' });

describe('ReservationForm conditional activity notices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchFormOptions).mockResolvedValue(mockOptions);
    vi.mocked(fetchFormConstraints).mockResolvedValue(mockConstraints);
    vi.mocked(fetchBlockedPeriods).mockResolvedValue([]);
  });

  it('does not ask while the location does not match yet, then asks once Meteor is picked', async () => {
    const user = userEvent.setup();
    render(<ReservationForm onSuccess={vi.fn()} onOpenPrivacy={vi.fn()} />);
    await goToStep2(user);

    // 8 guests is the default; no location chosen yet.
    await user.click(alaCarte());
    expect(screen.queryByTestId('activity-notice-dialog')).not.toBeInTheDocument();
    expect(alaCarte()).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByText(PRE_ORDER)).not.toBeInTheDocument();

    await user.click(screen.getByTestId('location-METEOR'));

    expect(await screen.findByTestId('activity-notice-dialog')).toHaveTextContent(PRE_ORDER);
    await user.click(screen.getByTestId('activity-notice-confirm'));

    await waitFor(() => expect(screen.queryByTestId('activity-notice-dialog')).not.toBeInTheDocument());
    expect(alaCarte()).toHaveAttribute('aria-checked', 'true');
    // Still shown as a banner under the activities.
    expect(screen.getByTestId('activity-notice')).toHaveTextContent(PRE_ORDER);

    // Once acknowledged, a bigger group does not ask again.
    setGuests('12');
    expect(screen.queryByTestId('activity-notice-dialog')).not.toBeInTheDocument();
  });

  it('never asks at Hubble', async () => {
    const user = userEvent.setup();
    render(<ReservationForm onSuccess={vi.fn()} onOpenPrivacy={vi.fn()} />);
    await goToStep2(user);

    await user.click(screen.getByTestId('location-HUBBLE'));
    await user.click(alaCarte());
    setGuests('12');

    expect(screen.queryByTestId('activity-notice-dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(PRE_ORDER)).not.toBeInTheDocument();
    expect(alaCarte()).toHaveAttribute('aria-checked', 'true');
  });

  it('asks before selecting when Meteor and 8+ guests are already set, and declining leaves it unselected', async () => {
    const user = userEvent.setup();
    render(<ReservationForm onSuccess={vi.fn()} onOpenPrivacy={vi.fn()} />);
    await goToStep2(user);

    await user.click(screen.getByTestId('location-METEOR'));
    await user.click(alaCarte());

    expect(await screen.findByTestId('activity-notice-dialog')).toHaveTextContent(PRE_ORDER);
    expect(alaCarte()).toHaveAttribute('aria-checked', 'false');

    await user.click(screen.getByTestId('activity-notice-decline'));

    await waitFor(() => expect(screen.queryByTestId('activity-notice-dialog')).not.toBeInTheDocument());
    expect(alaCarte()).toHaveAttribute('aria-checked', 'false');
  });

  it('asks when a small Meteor group grows to 8, and declining deselects the activity', async () => {
    const user = userEvent.setup();
    render(<ReservationForm onSuccess={vi.fn()} onOpenPrivacy={vi.fn()} />);
    await goToStep2(user);

    // Under 8 guests the form locks the location to Meteor.
    setGuests('5');
    await user.click(alaCarte());
    expect(screen.queryByTestId('activity-notice-dialog')).not.toBeInTheDocument();
    expect(alaCarte()).toHaveAttribute('aria-checked', 'true');

    setGuests('8');

    expect(await screen.findByTestId('activity-notice-dialog')).toHaveTextContent(PRE_ORDER);
    await user.click(screen.getByTestId('activity-notice-decline'));

    await waitFor(() => expect(screen.queryByTestId('activity-notice-dialog')).not.toBeInTheDocument());
    expect(alaCarte()).toHaveAttribute('aria-checked', 'false');
  });
});
