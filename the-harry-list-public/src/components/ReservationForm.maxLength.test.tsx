import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationForm } from './ReservationForm';
import type { FormOptions } from '../types/reservation';

// Text fields stop at the length the backend accepts, so a guest never types a long message
// only to have the submit rejected.

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
  specialActivities: [],
  invoiceTypes: [],
  locations: [{ value: 'HUBBLE', displayName: 'Hubble' }],
  paymentOptions: [],
  seatingAreas: [{ value: 'INSIDE', displayName: 'Inside' }],
};

describe('ReservationForm: text length limits', () => {
  beforeEach(() => {
    vi.mocked(fetchFormOptions).mockResolvedValue(mockOptions);
    vi.mocked(fetchFormConstraints).mockResolvedValue([]);
    vi.mocked(fetchBlockedPeriods).mockResolvedValue([]);
  });

  it('caps the contact fields at the backend limits', async () => {
    const { container } = render(<ReservationForm onSuccess={vi.fn()} onOpenPrivacy={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText('Loading form options...')).not.toBeInTheDocument());

    expect(container.querySelector('#contactName')).toHaveAttribute('maxlength', '255');
    expect(container.querySelector('#email')).toHaveAttribute('maxlength', '255');
    expect(container.querySelector('#phoneNumber')).toHaveAttribute('maxlength', '50');
    expect(container.querySelector('#organizationName')).toHaveAttribute('maxlength', '255');
  });
});
