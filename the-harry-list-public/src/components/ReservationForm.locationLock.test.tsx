import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationForm } from './ReservationForm';
import type { FormOptions, FormConstraint } from '../types/reservation';

// The form forces a location for small groups (under 8 guests: Meteor) and for activities
// locked to one bar. Once that lock lifts, the guest's own choice must come back.

vi.mock('../lib/api', () => ({
  fetchFormOptions: vi.fn(),
  fetchFormConstraints: vi.fn(),
  fetchBlockedPeriods: vi.fn(),
  submitReservation: vi.fn(),
  getAltchaChallengeUrl: vi.fn(() => 'http://localhost:8080/api/public/altcha/challenge'),
}));

vi.mock('altcha', () => ({}));

import { fetchFormOptions, fetchFormConstraints, fetchBlockedPeriods } from '../lib/api';

const mockOptions: FormOptions = {
  specialActivities: [
    { value: 'CATERING_CORONA_ROOM', displayName: 'Catering for Corona Room Event' },
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
    id: 1,
    constraintType: 'LOCATION_LOCK',
    triggerActivity: 'CATERING_CORONA_ROOM',
    targetValue: 'HUBBLE',
    message: 'Corona Room catering is only available at Hubble.',
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

const location = (value: 'HUBBLE' | 'METEOR' | 'NO_PREFERENCE') =>
  screen.getByTestId(`location-${value}`) as HTMLInputElement;
const setGuests = (value: string) =>
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value } });

describe('ReservationForm location lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchFormOptions).mockResolvedValue(mockOptions);
    vi.mocked(fetchFormConstraints).mockResolvedValue(mockConstraints);
    vi.mocked(fetchBlockedPeriods).mockResolvedValue([]);
  });

  it('keeps Hubble when a guest count is typed digit by digit', async () => {
    const user = userEvent.setup();
    render(<ReservationForm onSuccess={vi.fn()} onOpenPrivacy={vi.fn()} />);
    await goToStep2(user);

    await user.click(location('HUBBLE'));
    const guests = screen.getByRole('spinbutton');
    await user.clear(guests);
    await user.type(guests, '12'); // passes through 1 guest, which locks to Meteor

    await waitFor(() => expect(location('HUBBLE')).toBeChecked());
    expect(location('METEOR')).not.toBeChecked();
  });

  it('forces Meteor for a small group and restores Hubble once the group is 8 or more', async () => {
    const user = userEvent.setup();
    render(<ReservationForm onSuccess={vi.fn()} onOpenPrivacy={vi.fn()} />);
    await goToStep2(user);

    await user.click(location('HUBBLE'));
    setGuests('5');
    await waitFor(() => expect(location('METEOR')).toBeChecked());
    expect(location('HUBBLE')).toBeDisabled();

    setGuests('10');
    await waitFor(() => expect(location('HUBBLE')).toBeChecked());
    expect(location('HUBBLE')).toBeEnabled();
  });

  it('keeps Meteor when the guest chose it themselves', async () => {
    const user = userEvent.setup();
    render(<ReservationForm onSuccess={vi.fn()} onOpenPrivacy={vi.fn()} />);
    await goToStep2(user);

    await user.click(location('METEOR'));
    setGuests('5');
    setGuests('10');

    await waitFor(() => expect(location('METEOR')).toBeChecked());
  });

  it('leaves no location chosen when the guest had not picked one before the lock', async () => {
    const user = userEvent.setup();
    render(<ReservationForm onSuccess={vi.fn()} onOpenPrivacy={vi.fn()} />);
    await goToStep2(user);

    setGuests('5');
    await waitFor(() => expect(location('METEOR')).toBeChecked());

    setGuests('10');
    await waitFor(() => expect(location('METEOR')).not.toBeChecked());
    expect(location('HUBBLE')).not.toBeChecked();
    expect(location('NO_PREFERENCE')).not.toBeChecked();
  });

  it('restores the previous location when an activity lock is removed', async () => {
    const user = userEvent.setup();
    render(<ReservationForm onSuccess={vi.fn()} onOpenPrivacy={vi.fn()} />);
    await goToStep2(user);

    await user.click(location('METEOR'));
    const corona = screen.getByRole('checkbox', { name: 'Catering for Corona Room Event' });

    await user.click(corona);
    await waitFor(() => expect(location('HUBBLE')).toBeChecked());

    await user.click(corona);
    await waitFor(() => expect(location('METEOR')).toBeChecked());
  });
});
