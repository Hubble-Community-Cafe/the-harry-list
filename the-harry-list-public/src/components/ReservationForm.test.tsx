import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationForm } from './ReservationForm';
import type { FormOptions, FormConstraint, BlockedPeriod } from '../types/reservation';

// Mock API module
vi.mock('../lib/api', () => ({
  fetchFormOptions: vi.fn(),
  fetchFormConstraints: vi.fn(),
  fetchBlockedPeriods: vi.fn(),
  submitReservation: vi.fn(),
  getRecaptchaSiteKey: vi.fn(() => null),
}));

// Mock reCAPTCHA
vi.mock('react-google-recaptcha-v3', () => ({
  useGoogleReCaptcha: () => ({ executeRecaptcha: null }),
  GoogleReCaptchaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { fetchFormOptions, fetchFormConstraints, fetchBlockedPeriods, submitReservation } from '../lib/api';

const mockOptions: FormOptions = {
  specialActivities: [
    { value: 'GRADUATION', displayName: 'Graduation / PhD Defense' },
    { value: 'EAT_A_LA_CARTE', displayName: 'Eat a la Carte' },
    { value: 'EAT_CATERING', displayName: 'Catering' },
    { value: 'CATERING_CORONA_ROOM', displayName: 'Catering for Corona Room Event' },
    { value: 'PRIVATE_EVENT', displayName: 'Private Event' },
  ],
  invoiceTypes: [
    { value: 'TUE', displayName: 'TU/e' },
    { value: 'FONTYS', displayName: 'Fontys' },
    { value: 'EXTERNAL', displayName: 'External' },
  ],
  locations: [
    { value: 'HUBBLE', displayName: 'Hubble' },
    { value: 'METEOR', displayName: 'Meteor' },
  ],
  paymentOptions: [
    { value: 'INDIVIDUAL', displayName: 'People pay individually' },
    { value: 'ONE_PERSON', displayName: 'One person pays at the end' },
    { value: 'INVOICE', displayName: 'Invoice' },
  ],
  seatingAreas: [
    { value: 'INSIDE', displayName: 'Inside' },
    { value: 'OUTSIDE', displayName: 'Outside' },
  ],
};

const mockConstraints: FormConstraint[] = [
  {
    id: 1,
    constraintType: 'LOCATION_LOCK',
    triggerActivity: 'PRIVATE_EVENT',
    targetValue: 'METEOR',
    message: 'Private events are only available at Meteor.',
    enabled: true,
  },
  {
    id: 2,
    constraintType: 'LOCATION_LOCK',
    triggerActivity: 'CATERING_CORONA_ROOM',
    targetValue: 'HUBBLE',
    message: 'Corona Room catering is only available at Hubble.',
    enabled: true,
  },
  {
    id: 3,
    constraintType: 'ACTIVITY_CONFLICT',
    triggerActivity: 'PRIVATE_EVENT',
    targetValue: 'CATERING_CORONA_ROOM',
    message: 'Cannot combine Private Event with Corona Room catering.',
    enabled: true,
  },
  {
    id: 4,
    constraintType: 'ACTIVITY_CONFLICT',
    triggerActivity: 'CATERING_CORONA_ROOM',
    targetValue: 'PRIVATE_EVENT',
    message: 'Cannot combine Corona Room catering with Private Event.',
    enabled: true,
  },
  {
    id: 5,
    constraintType: 'GUEST_LIMIT',
    triggerActivity: 'EAT_A_LA_CARTE',
    numericValue: 15,
    message: 'A la carte dining is limited to 15 guests.',
    enabled: true,
  },
  {
    id: 6,
    constraintType: 'ADVANCE_BOOKING',
    triggerActivity: 'EAT_CATERING',
    numericValue: 14,
    message: 'Catering requires 14 days advance booking.',
    enabled: true,
  },
];

const mockBlockedPeriods: BlockedPeriod[] = [];

// Helper to get select by name attribute (register() sets name but not id)
function getSelectByName(name: string): HTMLSelectElement {
  const el = document.querySelector(`select[name="${name}"]`);
  if (!el) throw new Error(`Select with name="${name}" not found`);
  return el as HTMLSelectElement;
}

function getInputByName(name: string): HTMLInputElement {
  const el = document.querySelector(`input[name="${name}"]`);
  if (!el) throw new Error(`Input with name="${name}" not found`);
  return el as HTMLInputElement;
}

function setupMocks() {
  vi.mocked(fetchFormOptions).mockResolvedValue(mockOptions);
  vi.mocked(fetchFormConstraints).mockResolvedValue(mockConstraints);
  vi.mocked(fetchBlockedPeriods).mockResolvedValue(mockBlockedPeriods);
}

function renderForm(onSuccess = vi.fn()) {
  return {
    onSuccess,
    user: userEvent.setup(),
    ...render(<ReservationForm onSuccess={onSuccess} />),
  };
}

async function waitForFormLoaded() {
  await waitFor(() => {
    expect(screen.queryByText('Loading form options...')).not.toBeInTheDocument();
  });
}

// Fill step 2 required fields (time via fireEvent since selects lack accessible names)
async function fillStep2Fields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('Annual Association Drinks'), 'Test Event');
  await user.type(screen.getByPlaceholderText('Tell us more about your event...'), 'A test event');

  // Date input
  const dateField = getInputByName('eventDate');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  fireEvent.change(dateField, { target: { value: tomorrow.toISOString().split('T')[0] } });

  // Time selects
  fireEvent.change(getSelectByName('startTime'), { target: { value: '14:00' } });
  fireEvent.change(getSelectByName('endTime'), { target: { value: '16:00' } });
}

describe('ReservationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  // ==================== LOADING & INITIAL RENDER ====================

  describe('loading state', () => {
    it('shows loading spinner while options are being fetched', () => {
      vi.mocked(fetchFormOptions).mockReturnValue(new Promise(() => {}));
      renderForm();
      expect(screen.getByText('Loading form options...')).toBeInTheDocument();
    });

    it('renders step 1 (Contact) after options load', async () => {
      renderForm();
      await waitForFormLoaded();
      expect(screen.getByText('Contact Information')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('john@example.com')).toBeInTheDocument();
    });

    it('shows error when options fail to load', async () => {
      vi.mocked(fetchFormOptions).mockRejectedValue(new Error('Network error'));
      renderForm();
      await waitFor(() => {
        expect(screen.getByText('Failed to load form options. Please refresh the page.')).toBeInTheDocument();
      });
    });
  });

  // ==================== STEP NAVIGATION ====================

  describe('step navigation', () => {
    it('shows 5 step buttons', async () => {
      renderForm();
      await waitForFormLoaded();
      expect(screen.getByText('Contact')).toBeInTheDocument();
      expect(screen.getByText('Activity')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Payment')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('starts on step 1', async () => {
      renderForm();
      await waitForFormLoaded();
      const step1Button = screen.getByRole('button', { name: /Step 1: Contact/ });
      expect(step1Button).toHaveAttribute('aria-current', 'step');
    });

    it('does not navigate forward with empty required fields', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();

      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(screen.getByText('Contact Information')).toBeInTheDocument();
    });

    it('navigates to step 2 with valid contact info', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();

      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => {
        expect(screen.getByText('Activity Details')).toBeInTheDocument();
      });
    });

    it('navigates back from step 2 to step 1', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();

      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Activity Details')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: 'Go to previous step' }));
      expect(screen.getByText('Contact Information')).toBeInTheDocument();
    });

    it('back button is hidden on step 1', async () => {
      renderForm();
      await waitForFormLoaded();
      const backButton = screen.getByRole('button', { name: 'Go to previous step' });
      expect(backButton).toHaveClass('opacity-0');
    });
  });

  // ==================== STEP 1: CONTACT VALIDATION ====================

  describe('step 1 - contact validation', () => {
    it('shows error for name shorter than 2 chars', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();

      await user.type(screen.getByPlaceholderText('John Doe'), 'J');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => {
        expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
      });
    });

    it('shows error for invalid email', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();

      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'not-an-email');
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
      });
    });

    it('shows error for invalid phone number', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();

      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.type(screen.getByPlaceholderText('+31 6 12345678'), 'abc');
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument();
      });
    });

    it('accepts valid phone number', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();

      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.type(screen.getByPlaceholderText('+31 6 12345678'), '+31 6 12345678');
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => {
        expect(screen.getByText('Activity Details')).toBeInTheDocument();
      });
    });
  });

  // ==================== STEP 2: ACTIVITY DETAILS ====================

  describe('step 2 - activity details', () => {
    async function goToStep2(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Activity Details')).toBeInTheDocument());
    }

    it('shows activity toggle buttons', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      expect(screen.getByRole('checkbox', { name: 'Graduation / PhD Defense' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Eat a la Carte' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Private Event' })).toBeInTheDocument();
    });

    it('toggles activity selection', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      const graduation = screen.getByRole('checkbox', { name: 'Graduation / PhD Defense' });
      expect(graduation).toHaveAttribute('aria-checked', 'false');

      await user.click(graduation);
      expect(graduation).toHaveAttribute('aria-checked', 'true');

      await user.click(graduation);
      expect(graduation).toHaveAttribute('aria-checked', 'false');
    });

    it('shows guest limit warning when exceeded', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      await user.click(screen.getByRole('checkbox', { name: 'Eat a la Carte' }));

      const guestInput = screen.getByRole('spinbutton');
      await user.clear(guestInput);
      await user.type(guestInput, '16');

      await waitFor(() => {
        expect(screen.getByText('A la carte dining is limited to 15 guests.')).toBeInTheDocument();
      });
    });

    it('shows small group info when guests < 8', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      const guestInput = screen.getByRole('spinbutton');
      await user.clear(guestInput);
      await user.type(guestInput, '5');

      await waitFor(() => {
        expect(screen.getByText(/Reservations under 8 guests are only available at Meteor/)).toBeInTheDocument();
      });
    });

    it('increments guest count with plus button', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      const guestInput = screen.getByRole('spinbutton');
      expect(guestInput).toHaveValue(8);

      await user.click(screen.getByRole('button', { name: 'Increase guest count' }));
      expect(guestInput).toHaveValue(9);
    });

    it('decrements guest count with minus button', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      const guestInput = screen.getByRole('spinbutton');
      expect(guestInput).toHaveValue(8);

      await user.click(screen.getByRole('button', { name: 'Decrease guest count' }));
      expect(guestInput).toHaveValue(7);
    });

    it('shows advance booking notice for catering', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      await user.click(screen.getByRole('checkbox', { name: 'Catering' }));

      await waitFor(() => {
        expect(screen.getByText(/14 days/)).toBeInTheDocument();
      });
    });

    it('shows catering dietary notes when catering selected', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      expect(screen.queryByPlaceholderText(/Allergies/)).not.toBeInTheDocument();

      await user.click(screen.getByRole('checkbox', { name: 'Catering' }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Allergies/)).toBeInTheDocument();
      });
    });

    it('blocks navigation when guest limit exceeded', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      await user.click(screen.getByRole('checkbox', { name: 'Eat a la Carte' }));
      const guestInput = screen.getByRole('spinbutton');
      await user.clear(guestInput);
      await user.type(guestInput, '16');

      await user.type(screen.getByPlaceholderText('Annual Association Drinks'), 'Test Event');
      await user.type(screen.getByPlaceholderText('Tell us more about your event...'), 'A test event');

      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(screen.getByText('Activity Details')).toBeInTheDocument();
    });
  });

  // ==================== CONSTRAINT LOGIC ====================

  describe('constraint logic', () => {
    async function goToStep2(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Activity Details')).toBeInTheDocument());
    }

    it('disables conflicting activities', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      // Select PRIVATE_EVENT first
      await user.click(screen.getByRole('checkbox', { name: 'Private Event' }));
      expect(screen.getByRole('checkbox', { name: 'Private Event' })).toHaveAttribute('aria-checked', 'true');

      // CATERING_CORONA_ROOM should now be disabled
      const coronaButton = screen.getByRole('checkbox', { name: 'Catering for Corona Room Event' });
      expect(coronaButton).toBeDisabled();
    });

    it('shows location conflict for small groups with incompatible activity', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      // Select CATERING_CORONA_ROOM (locks to HUBBLE)
      await user.click(screen.getByRole('checkbox', { name: 'Catering for Corona Room Event' }));

      // Set guests < 8 (requires METEOR)
      const guestInput = screen.getByRole('spinbutton');
      await user.clear(guestInput);
      await user.type(guestInput, '5');

      await waitFor(() => {
        expect(screen.getByText(/only available at Meteor, but the selected activity requires HUBBLE/)).toBeInTheDocument();
      });
    });
  });

  // ==================== STEP 3: LOCATION ====================

  describe('step 3 - location', () => {
    async function goToStep3(user: ReturnType<typeof userEvent.setup>) {
      // Step 1
      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Activity Details')).toBeInTheDocument());

      // Step 2
      await fillStep2Fields(user);
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Where would you like to host your event?')).toBeInTheDocument());
    }

    it('shows location options (Hubble, Meteor, No Preference)', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep3(user);

      expect(screen.getByText('Hubble')).toBeInTheDocument();
      expect(screen.getByText('Meteor')).toBeInTheDocument();
      expect(screen.getByText('No Preference')).toBeInTheDocument();
    });

    it('shows seating area options', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep3(user);

      expect(screen.getByText('Inside')).toBeInTheDocument();
      expect(screen.getByText('Outside')).toBeInTheDocument();
    });
  });

  // ==================== STEP 4: PAYMENT ====================

  describe('step 4 - payment', () => {
    async function goToStep4(user: ReturnType<typeof userEvent.setup>) {
      // Step 1
      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Activity Details')).toBeInTheDocument());

      // Step 2
      await fillStep2Fields(user);
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Where would you like to host your event?')).toBeInTheDocument());

      // Step 3
      await user.click(screen.getByText('Inside'));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Payment Information')).toBeInTheDocument());
    }

    it('shows payment options', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep4(user);

      expect(screen.getByText('People pay individually')).toBeInTheDocument();
      expect(screen.getByText('One person pays at the end')).toBeInTheDocument();
      expect(screen.getByText('Invoice (>50 euros only)')).toBeInTheDocument();
    });

    it('shows invoice type selector when Invoice is selected', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep4(user);

      await user.click(screen.getByText('Invoice (>50 euros only)'));

      await waitFor(() => {
        expect(screen.getByText('Invoice Type *')).toBeInTheDocument();
      });
    });

    it('shows kostenplaats field for TU/e invoice', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep4(user);

      await user.click(screen.getByText('Invoice (>50 euros only)'));
      await waitFor(() => expect(screen.getByText('Invoice Type *')).toBeInTheDocument());

      fireEvent.change(getSelectByName('invoiceType'), { target: { value: 'TUE' } });

      await waitFor(() => {
        expect(screen.getByText('Kostenplaats *')).toBeInTheDocument();
      });
    });

    it('shows company fields for External invoice', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep4(user);

      await user.click(screen.getByText('Invoice (>50 euros only)'));
      await waitFor(() => expect(screen.getByText('Invoice Type *')).toBeInTheDocument());

      fireEvent.change(getSelectByName('invoiceType'), { target: { value: 'EXTERNAL' } });

      await waitFor(() => {
        expect(screen.getByText('Company Name *')).toBeInTheDocument();
        expect(screen.getByText('Invoice Address *')).toBeInTheDocument();
      });
    });
  });

  // ==================== SUBMISSION ====================

  describe('form submission', () => {
    async function navigateToStep5(user: ReturnType<typeof userEvent.setup>) {
      // Step 1
      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Activity Details')).toBeInTheDocument());

      // Step 2
      await fillStep2Fields(user);
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Where would you like to host your event?')).toBeInTheDocument());

      // Step 3
      await user.click(screen.getByText('Inside'));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Payment Information')).toBeInTheDocument());

      // Step 4
      await user.click(screen.getByText('People pay individually'));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Review & Confirm')).toBeInTheDocument());
    }

    it('calls submitReservation and onSuccess on successful submit', async () => {
      const mockResult = {
        confirmationNumber: 'ABC-123',
        eventTitle: 'Test Event',
        contactName: 'Jane Smith',
        email: 'jane@example.com',
        message: 'Reservation submitted',
      };
      vi.mocked(submitReservation).mockResolvedValue(mockResult);

      const onSuccess = vi.fn();
      const { user } = renderForm(onSuccess);
      await waitForFormLoaded();
      await navigateToStep5(user);

      await user.click(screen.getByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: 'Submit Reservation' }));

      await waitFor(() => {
        expect(submitReservation).toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalledWith(mockResult);
      });
    });

    it('shows submit error on failure', async () => {
      vi.mocked(submitReservation).mockRejectedValue(new Error('Server error'));

      const { user } = renderForm();
      await waitForFormLoaded();
      await navigateToStep5(user);

      await user.click(screen.getByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: 'Submit Reservation' }));

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });
  });

  // ==================== IMPORTANT NOTES BANNER ====================

  describe('info banner', () => {
    it('shows important notes on step 1', async () => {
      renderForm();
      await waitForFormLoaded();
      expect(screen.getByText(/This is a/)).toBeInTheDocument();
      expect(screen.getByText(/request form/)).toBeInTheDocument();
    });
  });

  // ==================== LONG RESERVATION ====================

  describe('long reservation warning', () => {
    async function goToStep2(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Activity Details')).toBeInTheDocument());
    }

    it('shows reason field when duration > 3 hours', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      fireEvent.change(getSelectByName('startTime'), { target: { value: '12:00' } });
      fireEvent.change(getSelectByName('endTime'), { target: { value: '16:00' } });

      await waitFor(() => {
        expect(screen.getByText(/Reason for Long Reservation/)).toBeInTheDocument();
        expect(screen.getByText(/4h long/)).toBeInTheDocument();
      });
    });

    it('does not show reason field for 3 hours or less', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      fireEvent.change(getSelectByName('startTime'), { target: { value: '14:00' } });
      fireEvent.change(getSelectByName('endTime'), { target: { value: '17:00' } });

      expect(screen.queryByText(/Reason for Long Reservation/)).not.toBeInTheDocument();
    });
  });
});
