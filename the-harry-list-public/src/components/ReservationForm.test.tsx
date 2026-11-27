import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationForm } from './ReservationForm';
import { formatEventDate } from '../lib/formatDate';
import type { FormOptions, FormConstraint, BlockedPeriod } from '../types/reservation';

// Mock API module
vi.mock('../lib/api', () => ({
  fetchFormOptions: vi.fn(),
  fetchFormConstraints: vi.fn(),
  fetchBlockedPeriods: vi.fn(),
  submitReservation: vi.fn(),
  getAltchaChallengeUrl: vi.fn(() => 'http://localhost:8080/api/public/altcha/challenge'),
}));

// Prevent altcha custom element from registering web workers in jsdom
vi.mock('altcha', () => ({}));

import { fetchFormOptions, fetchFormConstraints, fetchBlockedPeriods, submitReservation } from '../lib/api';

const mockOptions: FormOptions = {
  specialActivities: [
    { value: 'GRADUATION', displayName: 'Graduation / PhD defense' },
    { value: 'EAT_A_LA_CARTE', displayName: 'Eat a la carte' },
    { value: 'EAT_CATERING', displayName: 'Catering' },
    { value: 'CATERING_CORONA_ROOM', displayName: 'Catering for Corona Room event' },
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
    triggerActivity: 'EAT_CATERING',
    targetValue: 'METEOR',
    message: 'Catering is only available at Meteor.',
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
    triggerActivity: 'EAT_A_LA_CARTE',
    targetValue: 'CATERING_CORONA_ROOM',
    message: 'Cannot combine A la Carte with Corona Room catering.',
    enabled: true,
  },
  {
    id: 4,
    constraintType: 'ACTIVITY_CONFLICT',
    triggerActivity: 'CATERING_CORONA_ROOM',
    targetValue: 'EAT_A_LA_CARTE',
    message: 'Cannot combine Corona Room catering with A la Carte.',
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
    message: "Catering needs at least 14 days' notice.",
    enabled: true,
  },
  {
    id: 7,
    constraintType: 'ACTIVITY_NOTICE',
    triggerActivity: 'EAT_A_LA_CARTE',
    message: 'A la carte dining at Meteor has an additional charge.',
    enabled: true,
  },
  {
    // targetValue=CONFIRM opts this notice into a blocking acknowledgement dialog.
    id: 8,
    constraintType: 'ACTIVITY_NOTICE',
    triggerActivity: 'GRADUATION',
    targetValue: 'CONFIRM',
    message: 'Graduations require a deposit paid in advance.',
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

function renderForm(onSuccess = vi.fn(), onOpenPrivacy = vi.fn()) {
  return {
    onSuccess,
    onOpenPrivacy,
    user: userEvent.setup(),
    ...render(<ReservationForm onSuccess={onSuccess} onOpenPrivacy={onOpenPrivacy} />),
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
      expect(screen.getByText('Contact information')).toBeInTheDocument();
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

    it('never offers the retired private event, not even from the offline fallback list', async () => {
      // With the options request down, the form falls back to its own hardcoded labels.
      // That list must not resurrect an activity the backend no longer offers.
      const user = userEvent.setup();
      vi.mocked(fetchFormOptions).mockRejectedValue(new Error('Network error'));
      renderForm();
      await waitFor(() => {
        expect(screen.getByText('Failed to load form options. Please refresh the page.')).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Event details')).toBeInTheDocument());

      expect(screen.queryByRole('checkbox', { name: /Private Event/i })).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Graduation / PhD defense' })).toBeInTheDocument();
    });
  });

  // ==================== STEP NAVIGATION ====================

  describe('step navigation', () => {
    it('shows 4 step buttons', async () => {
      renderForm();
      await waitForFormLoaded();
      expect(screen.getByText('Contact')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Payment')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('starts on step 1', async () => {
      renderForm();
      await waitForFormLoaded();
      const step1Button = screen.getByRole('button', { name: 'Step 1 of 4: Contact' });
      expect(step1Button).toHaveAttribute('aria-current', 'step');
    });

    it('moves focus to the new step heading and marks earlier steps completed', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();

      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => expect(screen.getByRole('heading', { name: 'Event details' })).toHaveFocus());
      expect(screen.getByRole('navigation', { name: 'Reservation progress' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Step 1 of 4: Contact, completed' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Step 2 of 4: Details' })).toHaveAttribute('aria-current', 'step');
    });

    it('marks a field with an error invalid and links it to the message', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();

      await user.click(screen.getByRole('button', { name: 'Continue' }));

      const email = await screen.findByRole('textbox', { name: 'Email address *' });
      await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
      expect(email).toHaveAccessibleDescription('Please enter a valid email');

      await user.type(email, 'jane@example.com');
      await waitFor(() => expect(email).not.toHaveAttribute('aria-invalid'));
    });

    it('does not navigate forward with empty required fields', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();

      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(screen.getByText('Contact information')).toBeInTheDocument();
    });

    it('navigates to step 2 with valid contact info', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();

      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => {
        expect(screen.getByText('Event details')).toBeInTheDocument();
      });
    });

    it('navigates back from step 2 to step 1', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();

      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Event details')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: 'Back to previous step' }));
      expect(screen.getByText('Contact information')).toBeInTheDocument();
    });

    it('clears a field error while the guest types the fix, before they leave the field', async () => {
      // If the error only cleared on blur, it would vanish as the guest clicks Continue,
      // the button would shift up mid-click and the click would be lost.
      const { user } = renderForm();
      await waitForFormLoaded();

      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Please enter a valid email')).toBeInTheDocument());

      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      const email = screen.getByPlaceholderText('john@example.com');
      await user.type(email, 'jane@example.com');

      expect(email).toHaveFocus();
      await waitFor(() => {
        expect(screen.queryByText('Please enter a valid email')).not.toBeInTheDocument();
        expect(screen.queryByText('Name must be at least 2 characters')).not.toBeInTheDocument();
      });
    });

    it('back button is hidden on step 1', async () => {
      renderForm();
      await waitForFormLoaded();
      const backButton = screen.getByRole('button', { name: 'Back to previous step' });
      expect(backButton).toHaveClass('opacity-0');
    });
  });

  // ==================== STEP 1: CONTACT VALIDATION ====================

  describe('step 1 - contact validation', () => {
    it('lets the browser autofill the contact fields', async () => {
      renderForm();
      await waitForFormLoaded();
      expect(screen.getByPlaceholderText('John Doe')).toHaveAttribute('autocomplete', 'name');
      expect(screen.getByPlaceholderText('john@example.com')).toHaveAttribute('autocomplete', 'email');
      expect(screen.getByPlaceholderText('+31 6 12345678')).toHaveAttribute('autocomplete', 'tel');
      expect(screen.getByPlaceholderText('Your organization name')).toHaveAttribute('autocomplete', 'organization');
    });

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
        expect(screen.getByText('Event details')).toBeInTheDocument();
      });
    });
  });

  // ==================== STEP 2: ACTIVITY DETAILS ====================

  describe('step 2 - activity details', () => {
    async function goToStep2(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Event details')).toBeInTheDocument());
    }

    it('shows activity toggle buttons', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      expect(screen.getByRole('checkbox', { name: 'Graduation / PhD defense' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Eat a la carte' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Catering for Corona Room event' })).toBeInTheDocument();
    });

    it('toggles activity selection', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      // Uses an activity with no confirmation-required notice, so this stays a test of
      // plain toggling (see the notice-dialog tests for the confirmation path).
      const alaCarte = screen.getByRole('checkbox', { name: 'Eat a la carte' });
      expect(alaCarte).toHaveAttribute('aria-checked', 'false');

      await user.click(alaCarte);
      expect(alaCarte).toHaveAttribute('aria-checked', 'true');

      await user.click(alaCarte);
      expect(alaCarte).toHaveAttribute('aria-checked', 'false');
    });

    it('shows guest limit warning when exceeded', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      await user.click(screen.getByRole('checkbox', { name: 'Eat a la carte' }));

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

    it('shows the advance notice for catering', async () => {
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

      await user.click(screen.getByRole('checkbox', { name: 'Eat a la carte' }));
      const guestInput = screen.getByRole('spinbutton');
      await user.clear(guestInput);
      await user.type(guestInput, '16');

      await user.type(screen.getByPlaceholderText('Annual Association Drinks'), 'Test Event');
      await user.type(screen.getByPlaceholderText('Tell us more about your event...'), 'A test event');

      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(screen.getByText('Event details')).toBeInTheDocument();
      // The guest is told why: the limit notice is announced and gets focus.
      const notice = screen.getByRole('alert');
      expect(notice).toHaveTextContent('A la carte dining is limited to 15 guests.');
      expect(notice).toHaveFocus();
    });
  });

  // ==================== CONSTRAINT LOGIC ====================

  describe('constraint logic', () => {
    async function goToStep2(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Event details')).toBeInTheDocument());
    }

    it('disables conflicting activities', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      // Select EAT_A_LA_CARTE first
      await user.click(screen.getByRole('checkbox', { name: 'Eat a la carte' }));
      expect(screen.getByRole('checkbox', { name: 'Eat a la carte' })).toHaveAttribute('aria-checked', 'true');

      // CATERING_CORONA_ROOM should now be disabled
      const coronaButton = screen.getByRole('checkbox', { name: 'Catering for Corona Room event' });
      expect(coronaButton).toBeDisabled();
    });

    it('shows an advisory notice when an activity with an ACTIVITY_NOTICE is selected', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      // No notice until the triggering activity is picked.
      expect(screen.queryByTestId('activity-notice')).not.toBeInTheDocument();

      await user.click(screen.getByRole('checkbox', { name: 'Eat a la carte' }));

      await waitFor(() => {
        expect(screen.getByTestId('activity-notice')).toHaveTextContent(
          'A la carte dining at Meteor has an additional charge.'
        );
      });
    });

    it('asks for confirmation before selecting an activity whose notice requires it', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      const graduation = screen.getByRole('checkbox', { name: 'Graduation / PhD defense' });
      await user.click(graduation);

      // The activity is NOT selected yet: the dialog decides.
      expect(await screen.findByTestId('activity-notice-dialog')).toHaveTextContent(
        'Graduations require a deposit paid in advance.'
      );
      expect(screen.getByText('Please note')).toBeInTheDocument();
      expect(graduation).toHaveAttribute('aria-checked', 'false');

      await user.click(screen.getByTestId('activity-notice-confirm'));

      await waitFor(() => {
        expect(screen.queryByTestId('activity-notice-dialog')).not.toBeInTheDocument();
        expect(graduation).toHaveAttribute('aria-checked', 'true');
      });
    });

    it('leaves the activity unselected when the notice is declined', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      const graduation = screen.getByRole('checkbox', { name: 'Graduation / PhD defense' });
      await user.click(graduation);
      await screen.findByTestId('activity-notice-dialog');

      await user.click(screen.getByTestId('activity-notice-decline'));

      await waitFor(() => {
        expect(screen.queryByTestId('activity-notice-dialog')).not.toBeInTheDocument();
      });
      expect(graduation).toHaveAttribute('aria-checked', 'false');
    });

    it('treats dismissing the notice dialog with Escape as declining', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      const graduation = screen.getByRole('checkbox', { name: 'Graduation / PhD defense' });
      await user.click(graduation);
      await screen.findByTestId('activity-notice-dialog');

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByTestId('activity-notice-dialog')).not.toBeInTheDocument();
      });
      expect(graduation).toHaveAttribute('aria-checked', 'false');
    });

    it('does not prompt when deselecting a confirmed activity', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      const graduation = screen.getByRole('checkbox', { name: 'Graduation / PhD defense' });
      await user.click(graduation);
      await user.click(await screen.findByTestId('activity-notice-confirm'));
      await waitFor(() => expect(graduation).toHaveAttribute('aria-checked', 'true'));

      await user.click(graduation);

      expect(screen.queryByTestId('activity-notice-dialog')).not.toBeInTheDocument();
      expect(graduation).toHaveAttribute('aria-checked', 'false');
    });

    it('shows a banner without a dialog when the notice does not require confirmation', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      // EAT_A_LA_CARTE's notice has no targetValue, so it stays a passive banner.
      await user.click(screen.getByRole('checkbox', { name: 'Eat a la carte' }));

      expect(screen.queryByTestId('activity-notice-dialog')).not.toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId('activity-notice')).toHaveTextContent(
          'A la carte dining at Meteor has an additional charge.'
        );
      });
    });

    it('hides the advisory notice again when the activity is deselected', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      await user.click(screen.getByRole('checkbox', { name: 'Eat a la carte' }));
      await waitFor(() => expect(screen.getByTestId('activity-notice')).toBeInTheDocument());

      await user.click(screen.getByRole('checkbox', { name: 'Eat a la carte' }));
      await waitFor(() => expect(screen.queryByTestId('activity-notice')).not.toBeInTheDocument());
    });

    it('shows location conflict for small groups with incompatible activity', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      // Select CATERING_CORONA_ROOM (locks to HUBBLE)
      await user.click(screen.getByRole('checkbox', { name: 'Catering for Corona Room event' }));

      // Set guests < 8 (requires METEOR)
      const guestInput = screen.getByRole('spinbutton');
      await user.clear(guestInput);
      await user.type(guestInput, '5');

      await waitFor(() => {
        expect(screen.getByText(/only available at Meteor, but the selected activity requires HUBBLE/)).toBeInTheDocument();
      });
    });
  });

  // ==================== LOCATION & SEATING (merged into step 2) ====================

  describe('location & seating', () => {
    // Location/seating now live on the merged "Event details" step, below the time fields.
    async function goToDetails(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Event details')).toBeInTheDocument());
    }

    it('names every field and choice group on the details step', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToDetails(user);

      expect(screen.getByRole('spinbutton', { name: 'Expected number of guests *' })).toHaveAccessibleDescription(
        /Minimum reservation size/
      );
      expect(screen.getByRole('group', { name: 'Special activities' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Catering' })).toHaveAccessibleDescription('Catered food for your event');
      expect(screen.getByRole('radiogroup', { name: 'Location' })).toBeInTheDocument();
      expect(screen.getByRole('radiogroup', { name: 'Seating area *' })).toBeInTheDocument();
    });

    it('labels the long-reservation reason and links it to the duration hint', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToDetails(user);

      fireEvent.change(getSelectByName('startTime'), { target: { value: '14:00' } });
      fireEvent.change(getSelectByName('endTime'), { target: { value: '18:00' } });

      const reason = await screen.findByRole('textbox', { name: 'Reason for long reservation *' });
      expect(reason).toHaveAccessibleDescription(/Reservations over 3 hours require a reason/);
    });

    it('shows the location sub-section on the same step as the event details', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToDetails(user);

      expect(screen.getByText('Where would you like to host your event?')).toBeInTheDocument();
      expect(screen.getByText('Hubble')).toBeInTheDocument();
      expect(screen.getByText('Meteor')).toBeInTheDocument();
      expect(screen.getByText('No preference')).toBeInTheDocument();
    });

    it('shows seating area options on the same step', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToDetails(user);

      expect(screen.getByText('Inside')).toBeInTheDocument();
      expect(screen.getByText('Outside')).toBeInTheDocument();
    });
  });

  // ==================== SOFT / HARD BLOCKED PERIODS ====================

  describe('blocked periods', () => {
    // Wide global range so it always covers the "tomorrow" date used by fillStep2Fields.
    const wideRange = { startDate: '2020-01-01', endDate: '2099-12-31' };

    async function goToStep2(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Event details')).toBeInTheDocument());
    }

    it('lets the guest proceed past a soft block only after acknowledging it', async () => {
      vi.mocked(fetchBlockedPeriods).mockResolvedValue([
        {
          id: 1,
          ...wideRange,
          publicMessage: 'The bar is closed by default this summer.',
          softBlock: true,
          acknowledgementText: 'I understand the bar may be closed',
          enabled: true,
        },
      ]);

      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);
      await fillStep2Fields(user);

      // Warning + acknowledgement checkbox are shown
      expect(screen.getByText('The bar is closed by default this summer.')).toBeInTheDocument();
      const ack = screen.getByRole('checkbox', { name: 'I understand the bar may be closed' });

      // Cannot advance until acknowledged: and the form explains why
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(screen.getByText('Event details')).toBeInTheDocument();
      expect(screen.getByText(/tick the box above to confirm/i)).toBeInTheDocument();
      // Focus lands on the box to tick, which carries the prompt as its error.
      expect(ack).toHaveFocus();
      expect(ack).toHaveAttribute('aria-invalid', 'true');
      expect(ack).toHaveAccessibleDescription(/tick the box above to confirm/i);

      // Acknowledge, then advance succeeds (and the prompt disappears)
      await user.click(ack);
      expect(screen.queryByText(/tick the box above to confirm/i)).not.toBeInTheDocument();
      await user.click(screen.getByText('Inside')); // seating is required to advance
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() =>
        expect(screen.getByText('Payment information')).toBeInTheDocument()
      );
    });

    it('shows a location-specific soft block in the location section with its own acknowledgement', async () => {
      vi.mocked(fetchBlockedPeriods).mockResolvedValue([
        {
          id: 3,
          location: 'HUBBLE',
          ...wideRange,
          publicMessage: 'Hubble is closed by default this summer.',
          softBlock: true,
          acknowledgementText: 'I understand Hubble may be closed',
          enabled: true,
        },
      ]);

      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);
      await fillStep2Fields(user);

      // No location chosen yet → location-specific block does not surface
      expect(screen.queryByText('Hubble is closed by default this summer.')).not.toBeInTheDocument();

      // Choosing Hubble (same step) triggers the soft block in the location section
      await user.click(screen.getByText('Hubble'));
      await user.click(screen.getByText('Inside')); // seating is required to advance
      expect(await screen.findByText('Hubble is closed by default this summer.')).toBeInTheDocument();
      const ack = screen.getByRole('checkbox', { name: 'I understand Hubble may be closed' });

      // Still blocked until the soft block is acknowledged
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(screen.getByText('Event details')).toBeInTheDocument();

      await user.click(ack);
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Payment information')).toBeInTheDocument());
    });

    it('does not allow proceeding past a hard block and shows no acknowledgement checkbox', async () => {
      vi.mocked(fetchBlockedPeriods).mockResolvedValue([
        {
          id: 2,
          ...wideRange,
          publicMessage: 'Closed for renovation.',
          softBlock: false,
          enabled: true,
        },
      ]);

      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);
      await fillStep2Fields(user);

      expect(screen.getByText('Closed for renovation.')).toBeInTheDocument();
      expect(screen.queryByRole('checkbox', { name: /understand/i })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(screen.getByText('Event details')).toBeInTheDocument();
      expect(screen.getByTestId('blocked-date-notice')).toHaveAttribute('role', 'alert');
      expect(screen.getByTestId('blocked-date-notice')).toHaveFocus();
    });
  });

  // ==================== STEP 4: PAYMENT ====================

  describe('step 4 - payment', () => {
    async function goToStep4(user: ReturnType<typeof userEvent.setup>) {
      // Step 1
      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Event details')).toBeInTheDocument());

      // Step 2: merged event + location/seating
      await fillStep2Fields(user);
      await user.click(screen.getByText('Inside')); // seating is required to advance
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Payment information')).toBeInTheDocument());
    }

    it('groups the payment methods and links an unchosen method to its error', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep4(user);

      const group = screen.getByRole('radiogroup', { name: 'Payment method *' });
      await user.click(screen.getByRole('button', { name: 'Continue' }));

      const radios = within(group).getAllByRole('radio');
      await waitFor(() => expect(radios[0]).toHaveAttribute('aria-invalid', 'true'));
      expect(radios[0]).toHaveAccessibleDescription(/.+/);
    });

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
        expect(screen.getByText('Invoice type *')).toBeInTheDocument();
      });
    });

    it('shows the cost centre (kostenplaats) field for TU/e invoice', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep4(user);

      await user.click(screen.getByText('Invoice (>50 euros only)'));
      await waitFor(() => expect(screen.getByText('Invoice type *')).toBeInTheDocument());

      fireEvent.change(getSelectByName('invoiceType'), { target: { value: 'TUE' } });

      await waitFor(() => {
        expect(screen.getByText('Cost centre (kostenplaats) *')).toBeInTheDocument();
      });
    });

    it('shows company fields for External invoice', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep4(user);

      await user.click(screen.getByText('Invoice (>50 euros only)'));
      await waitFor(() => expect(screen.getByText('Invoice type *')).toBeInTheDocument());

      fireEvent.change(getSelectByName('invoiceType'), { target: { value: 'EXTERNAL' } });

      await waitFor(() => {
        expect(screen.getByText('Company name *')).toBeInTheDocument();
        expect(screen.getByText('Invoice address *')).toBeInTheDocument();
      });
    });
  });

  // ==================== SUBMISSION ====================

  describe('form submission', () => {
    async function navigateToStep5(user: ReturnType<typeof userEvent.setup>) {
      // Step 1: contact
      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Event details')).toBeInTheDocument());

      // Step 2: merged event + location/seating
      await fillStep2Fields(user);
      await user.click(screen.getByText('Inside'));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Payment information')).toBeInTheDocument());

      // Step 3: payment
      await user.click(screen.getByText('People pay individually'));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Review & confirm')).toBeInTheDocument());
    }

    it('does not submit or show the terms error when Continue opens the review step', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await navigateToStep5(user);

      expect(screen.queryByText('You must accept the terms')).not.toBeInTheDocument();
      expect(submitReservation).not.toHaveBeenCalled();
    });

    it('shows readable values on the review step, not raw codes', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await navigateToStep5(user);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const iso = tomorrow.toISOString().split('T')[0];

      expect(screen.getByText(formatEventDate(iso))).toBeInTheDocument();
      expect(screen.queryByText(iso)).not.toBeInTheDocument();
      expect(screen.getByText('No preference')).toBeInTheDocument();
    });

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
      await user.click(screen.getByRole('button', { name: 'Submit reservation' }));

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
      await user.click(screen.getByRole('button', { name: 'Submit reservation' }));

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });

    it('opens the privacy policy from the link by the terms checkbox', async () => {
      const onOpenPrivacy = vi.fn();
      const { user } = renderForm(vi.fn(), onOpenPrivacy);
      await waitForFormLoaded();
      await navigateToStep5(user);

      await user.click(screen.getByTestId('form-privacy-link'));
      expect(onOpenPrivacy).toHaveBeenCalledTimes(1);
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

    it('makes the same reply-time promise as the rest of the form, with no dashes', async () => {
      renderForm();
      await waitForFormLoaded();
      expect(screen.getByText(/We usually reply within 72 hours\./)).toBeInTheDocument();
      expect(screen.queryByText(/cannot reply within 72 hours/i)).not.toBeInTheDocument();
      const notes = screen.getByText(/request form/).closest('ul');
      expect(notes?.textContent).not.toMatch(/[\u2013\u2014]/);
    });
  });

  // ==================== LONG RESERVATION ====================

  describe('long reservation warning', () => {
    async function goToStep2(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Smith');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await waitFor(() => expect(screen.getByText('Event details')).toBeInTheDocument());
    }

    it('shows reason field when duration > 3 hours', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      fireEvent.change(getSelectByName('startTime'), { target: { value: '12:00' } });
      fireEvent.change(getSelectByName('endTime'), { target: { value: '16:00' } });

      await waitFor(() => {
        expect(screen.getByText(/Reason for long reservation/)).toBeInTheDocument();
        expect(screen.getByText(/4h long/)).toBeInTheDocument();
      });
    });

    it('does not show reason field for 3 hours or less', async () => {
      const { user } = renderForm();
      await waitForFormLoaded();
      await goToStep2(user);

      fireEvent.change(getSelectByName('startTime'), { target: { value: '14:00' } });
      fireEvent.change(getSelectByName('endTime'), { target: { value: '17:00' } });

      expect(screen.queryByText(/Reason for long reservation/)).not.toBeInTheDocument();
    });
  });

  // ==================== FORM OPTIONS RETRY ====================

  describe('form options loading retry', () => {
    it('shows error when all form option fetches fail', async () => {
      vi.mocked(fetchFormOptions).mockRejectedValue(new Error('Network error'));
      vi.mocked(fetchFormConstraints).mockRejectedValue(new Error('Network error'));
      vi.mocked(fetchBlockedPeriods).mockRejectedValue(new Error('Network error'));

      renderForm();

      await waitFor(() => {
        expect(screen.getByText('Failed to load form options. Please refresh the page.')).toBeInTheDocument();
      });
    });

    it('loads form successfully when all fetches succeed', async () => {
      renderForm();
      await waitForFormLoaded();

      expect(screen.getByText('Contact information')).toBeInTheDocument();
      expect(fetchFormOptions).toHaveBeenCalled();
      expect(fetchFormConstraints).toHaveBeenCalled();
      expect(fetchBlockedPeriods).toHaveBeenCalled();
    });
  });
});
