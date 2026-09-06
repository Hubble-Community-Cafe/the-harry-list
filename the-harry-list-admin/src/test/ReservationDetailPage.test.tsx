import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ReservationDetailPage } from '../pages/ReservationDetailPage';

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ accounts: [{ name: 'Staff Member' }] }),
}));

vi.mock('../lib/usePermissions', () => ({
  usePermissions: () => ({ canUpdateReservations: true }),
}));

const { sampleReservation, sampleAuditLog } = vi.hoisted(() => ({
  sampleReservation: {
    id: 1,
    eventTitle: 'Birthday Party',
    contactName: 'John Doe',
    email: 'john@example.com',
    status: 'CONFIRMED',
    eventDate: '2026-07-01',
    startTime: '14:00:00',
    endTime: '17:00:00',
    location: 'HUBBLE',
    expectedGuests: 25,
    confirmationNumber: 'ABC123',
    seatingArea: 'INSIDE',
    paymentOption: 'INDIVIDUAL',
    specialActivities: [],
  },
  sampleAuditLog: [
    {
      id: 10,
      entityType: 'RESERVATION',
      entityId: 1,
      entityLabel: 'ABC123 - Birthday Party',
      action: 'STATUS_CHANGE',
      actorOid: 'oid-1',
      actorEmail: 'staff@example.com',
      actorName: 'Staff Member',
      changes: [{ field: 'status', oldValue: 'PENDING', newValue: 'CONFIRMED' }],
      summary: 'Status changed',
      createdAt: '2026-06-01T12:00:00',
    },
  ],
}));

vi.mock('../lib/api', () => ({
  fetchReservation: vi.fn().mockResolvedValue(sampleReservation),
  fetchReservationAuditLog: vi.fn().mockResolvedValue(sampleAuditLog),
  updateReservationStatus: vi.fn(),
  deleteReservation: vi.fn(),
  updateReservation: vi.fn(),
  updateCateringArranged: vi.fn(),
  updateCoboContractSigned: vi.fn(),
  fetchEmailAttachments: vi.fn().mockResolvedValue([]),
  fetchMailPreview: vi.fn().mockResolvedValue({ subject: 'S', body: 'B' }),
  sendReservationMail: vi.fn(),
}));

import {
  fetchReservationAuditLog, fetchReservation, updateReservationStatus, updateReservation,
  fetchEmailAttachments, fetchMailPreview, sendReservationMail, updateCoboContractSigned,
} from '../lib/api';

const DEFAULT_REJECTION_MESSAGE =
  'Unfortunately we cannot host you since we do not have any places left at this time';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/reservations/1']}>
      <Routes>
        <Route path="/reservations/:id" element={<ReservationDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

/** Open the Change Status menu and pick a target, reaching the confirmation step. */
const chooseStatus = (target: string) => {
  fireEvent.click(screen.getByTestId('change-status'));
  fireEvent.click(screen.getByTestId(`status-option-${target}`));
};

describe('ReservationDetailPage — change history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the change history with actor, action and field diffs', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Change History')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Status changed')).toBeInTheDocument();
    expect(screen.getByText('Staff Member')).toBeInTheDocument();
    // Field-level diff: status PENDING -> CONFIRMED
    expect(screen.getByText('status')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    // CONFIRMED also appears in the status badge, so assert at least one occurrence (the diff).
    expect(screen.getAllByText('CONFIRMED').length).toBeGreaterThan(0);
  });

  it('shows an empty state and never crashes when the audit log fails to load', async () => {
    vi.mocked(fetchReservationAuditLog).mockRejectedValueOnce(new Error('boom'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No changes recorded yet.')).toBeInTheDocument();
    }, { timeout: 3000 });

    // The rest of the page still renders.
    expect(screen.getByText('Birthday Party')).toBeInTheDocument();
  });
});

describe('ReservationDetailPage — custom email message', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pre-fills the editable default rejection message and sends it', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'PENDING' });
    vi.mocked(updateReservationStatus).mockResolvedValueOnce({ ...sampleReservation, status: 'REJECTED' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    chooseStatus('REJECTED');

    const textarea = await screen.findByPlaceholderText(/shaded spot/i);
    expect(textarea).toHaveValue(DEFAULT_REJECTION_MESSAGE);

    fireEvent.click(screen.getByTestId('status-dialog-submit'));

    await waitFor(() =>
      expect(updateReservationStatus).toHaveBeenCalledWith(
        1, 'REJECTED', 'Staff Member', true, DEFAULT_REJECTION_MESSAGE));
  });

  it('sends a typed message when confirming', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'PENDING' });
    vi.mocked(updateReservationStatus).mockResolvedValueOnce({ ...sampleReservation, status: 'CONFIRMED' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    chooseStatus('CONFIRMED');

    const textarea = await screen.findByPlaceholderText(/shaded spot/i);
    expect(textarea).toHaveValue(''); // no default for confirmations
    fireEvent.change(textarea, { target: { value: 'We saved you a spot in the shade!' } });

    fireEvent.click(screen.getByTestId('status-dialog-submit'));

    await waitFor(() =>
      expect(updateReservationStatus).toHaveBeenCalledWith(
        1, 'CONFIRMED', 'Staff Member', true, 'We saved you a spot in the shade!'));
  });

  it('hides the message field when email notification is turned off', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'PENDING' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    fireEvent.click(screen.getByRole('checkbox')); // turn off "send email notification"
    chooseStatus('REJECTED');

    expect(screen.queryByPlaceholderText(/shaded spot/i)).not.toBeInTheDocument();
  });
});

describe('ReservationDetailPage — change status menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers exactly the transitions allowed from PENDING', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'PENDING' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('change-status'));

    expect(screen.getByTestId('status-option-IN_PROGRESS')).toBeInTheDocument();
    expect(screen.getByTestId('status-option-CONFIRMED')).toBeInTheDocument();
    expect(screen.getByTestId('status-option-REJECTED')).toBeInTheDocument();
    expect(screen.getByTestId('status-option-CANCELLED')).toBeInTheDocument();
    // COMPLETED is only reachable from CONFIRMED.
    expect(screen.queryByTestId('status-option-COMPLETED')).not.toBeInTheDocument();
  });

  it('offers only completion and cancellation from CONFIRMED', async () => {
    // sampleReservation defaults to CONFIRMED.
    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('change-status'));

    expect(screen.getByTestId('status-option-COMPLETED')).toBeInTheDocument();
    expect(screen.getByTestId('status-option-CANCELLED')).toBeInTheDocument();
    // A confirmed reservation cannot go back to pending or in-progress.
    expect(screen.queryByTestId('status-option-PENDING')).not.toBeInTheDocument();
    expect(screen.queryByTestId('status-option-IN_PROGRESS')).not.toBeInTheDocument();
  });

  it('hides the Change Status button entirely for a completed reservation', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'COMPLETED' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    // COMPLETED is terminal, so there is nothing to offer.
    expect(screen.queryByTestId('change-status')).not.toBeInTheDocument();
  });

  it('moves a pending reservation to IN_PROGRESS without ever emailing the customer', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'PENDING' });
    vi.mocked(updateReservationStatus).mockResolvedValueOnce({ ...sampleReservation, status: 'IN_PROGRESS' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    chooseStatus('IN_PROGRESS');

    // No email controls at all for an internal-only status.
    expect(screen.queryByPlaceholderText(/shaded spot/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /send email notification to customer/i }))
      .not.toBeInTheDocument();
    expect(screen.getByTestId('status-dialog')).toHaveTextContent('No email is sent for this status.');

    fireEvent.click(screen.getByTestId('status-dialog-submit'));

    await waitFor(() =>
      expect(updateReservationStatus).toHaveBeenCalledWith(
        1, 'IN_PROGRESS', 'Staff Member', false, undefined));

    await waitFor(() =>
      expect(screen.getByTestId('reservation-status')).toHaveTextContent('IN_PROGRESS'));
  });

  it('confirms from IN_PROGRESS and emails the customer', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'IN_PROGRESS' });
    vi.mocked(updateReservationStatus).mockResolvedValueOnce({ ...sampleReservation, status: 'CONFIRMED' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    chooseStatus('CONFIRMED');
    fireEvent.click(screen.getByTestId('status-dialog-submit'));

    await waitFor(() =>
      expect(updateReservationStatus).toHaveBeenCalledWith(1, 'CONFIRMED', 'Staff Member', true, ''));
  });

  it('closes the menu on an outside click', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'PENDING' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    fireEvent.click(screen.getByTestId('change-status'));
    expect(screen.getByTestId('status-menu')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByTestId('status-menu')).not.toBeInTheDocument();
  });

  it('closes the menu on Escape', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'PENDING' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    fireEvent.click(screen.getByTestId('change-status'));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByTestId('status-menu')).not.toBeInTheDocument();
  });

  it('keeps the menu open when clicking inside it', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'PENDING' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    fireEvent.click(screen.getByTestId('change-status'));
    fireEvent.mouseDown(screen.getByTestId('status-menu'));

    expect(screen.getByTestId('status-menu')).toBeInTheDocument();
  });

  /**
   * .card applies backdrop-blur, which creates a stacking context — a z-index on the menu alone
   * cannot lift it above the cards below, so the Actions card itself must be raised.
   */
  it('raises the actions card so the open menu is not painted over', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'PENDING' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    const actionsCard = screen.getByText('Actions').closest('.card');
    expect(actionsCard?.className).toMatch(/\brelative\b/);
    expect(actionsCard?.className).toMatch(/\bz-30\b/);
  });

  it('lets the editor back out without changing anything', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'PENDING' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    chooseStatus('CANCELLED');
    expect(screen.getByTestId('status-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('status-dialog-cancel'));

    expect(screen.queryByTestId('status-dialog')).not.toBeInTheDocument();
    expect(updateReservationStatus).not.toHaveBeenCalled();
  });
});

describe('ReservationDetailPage — reopen rejected reservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers only "Pending" as a transition for rejected reservations', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'REJECTED' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('change-status'));

    expect(screen.getByTestId('status-option-PENDING')).toBeInTheDocument();
    // A rejected reservation cannot be confirmed or cancelled directly.
    expect(screen.queryByTestId('status-option-CONFIRMED')).not.toBeInTheDocument();
    expect(screen.queryByTestId('status-option-CANCELLED')).not.toBeInTheDocument();
  });

  it('hides the "Send Mail" action for rejected reservations', async () => {
    const cateringActivities = ['EAT_CATERING'];
    // A catering reservation that is still pending offers the mail menu...
    vi.mocked(fetchReservation).mockResolvedValueOnce({
      ...sampleReservation, status: 'PENDING', specialActivities: cateringActivities,
    });
    const { unmount } = renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByTestId('send-mail')).toBeInTheDocument();
    unmount();

    // ...but once rejected, there's nothing left to follow up on, so the action is gone.
    vi.mocked(fetchReservation).mockResolvedValueOnce({
      ...sampleReservation, status: 'REJECTED', specialActivities: cateringActivities,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.queryByTestId('send-mail')).not.toBeInTheDocument();
  });

  it('does not offer a move back to pending for confirmed reservations', async () => {
    // sampleReservation defaults to CONFIRMED.
    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('change-status'));

    expect(screen.queryByTestId('status-option-PENDING')).not.toBeInTheDocument();
  });

  it('moves a rejected reservation back to PENDING without emailing by default', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'REJECTED' });
    vi.mocked(updateReservationStatus).mockResolvedValueOnce({ ...sampleReservation, status: 'PENDING' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    chooseStatus('PENDING');
    // Email is opt-in for this action, so the message field stays hidden.
    expect(screen.queryByPlaceholderText(/shaded spot/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('status-dialog-submit'));

    await waitFor(() =>
      expect(updateReservationStatus).toHaveBeenCalledWith(1, 'PENDING', 'Staff Member', false, undefined));

    // The badge reflects the new status.
    await waitFor(() => expect(screen.getByTestId('reservation-status')).toHaveTextContent('PENDING'));
  });

  it('also defaults to no email when reopening a cancelled reservation', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'CANCELLED' });
    vi.mocked(updateReservationStatus).mockResolvedValueOnce({ ...sampleReservation, status: 'PENDING' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    chooseStatus('PENDING');
    fireEvent.click(screen.getByTestId('status-dialog-submit'));

    await waitFor(() =>
      expect(updateReservationStatus).toHaveBeenCalledWith(1, 'PENDING', 'Staff Member', false, undefined));
  });

  it('sends a status email and message when the editor opts in', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'REJECTED' });
    vi.mocked(updateReservationStatus).mockResolvedValueOnce({ ...sampleReservation, status: 'PENDING' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    chooseStatus('PENDING');
    // Opt back in to the email.
    fireEvent.click(screen.getByRole('checkbox', { name: /send email notification to customer/i }));

    const textarea = await screen.findByPlaceholderText(/shaded spot/i);
    fireEvent.change(textarea, { target: { value: 'Good news — a slot opened up!' } });

    fireEvent.click(screen.getByTestId('status-dialog-submit'));

    await waitFor(() =>
      expect(updateReservationStatus).toHaveBeenCalledWith(
        1, 'PENDING', 'Staff Member', true, 'Good news — a slot opened up!'));
  });
});

describe('ReservationDetailPage — send mail menu', () => {
  const attachments = [
    { id: 1, name: 'Menu', filename: 'menu.pdf', contentType: 'application/pdf', active: true, createdAt: '' },
    { id: 2, name: 'Contract', filename: 'cobo.pdf', contentType: 'application/pdf', active: true, createdAt: '' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchEmailAttachments).mockResolvedValue(attachments);
    vi.mocked(fetchMailPreview).mockResolvedValue({ subject: 'Subject', body: 'Body' });
  });

  it('is hidden entirely when no mail applies to the reservation', async () => {
    // sampleReservation has no special activities.
    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    expect(screen.queryByTestId('send-mail')).not.toBeInTheDocument();
  });

  it('offers only catering for a catering reservation', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({
      ...sampleReservation, specialActivities: ['EAT_CATERING'],
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('send-mail'));

    expect(screen.getByTestId('mail-option-CATERING')).toBeInTheDocument();
    expect(screen.queryByTestId('mail-option-COBO')).not.toBeInTheDocument();
  });

  it('offers only CoBo for a CoBo reservation', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({
      ...sampleReservation, specialActivities: ['COBO'],
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('send-mail'));

    expect(screen.getByTestId('mail-option-COBO')).toBeInTheDocument();
    expect(screen.queryByTestId('mail-option-CATERING')).not.toBeInTheDocument();
  });

  it('offers both when the reservation is catering and CoBo', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({
      ...sampleReservation, specialActivities: ['EAT_CATERING', 'COBO'],
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('send-mail'));

    expect(screen.getByTestId('mail-option-CATERING')).toBeInTheDocument();
    expect(screen.getByTestId('mail-option-COBO')).toBeInTheDocument();
  });

  it('pre-ticks every attachment for a catering mail', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({
      ...sampleReservation, specialActivities: ['EAT_CATERING'],
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('send-mail'));
    fireEvent.click(screen.getByTestId('mail-option-CATERING'));

    await screen.findByText('Send Catering Options');
    const boxes = screen.getAllByRole('checkbox').filter(b => b.closest('label')?.textContent?.includes('.pdf'));
    expect(boxes).toHaveLength(2);
    boxes.forEach(b => expect(b).toBeChecked());
  });

  /** The attachment pool is shared, so a CoBo mail must not pre-tick the catering PDFs. */
  it('pre-ticks nothing for a CoBo mail', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({
      ...sampleReservation, specialActivities: ['COBO'],
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('send-mail'));
    fireEvent.click(screen.getByTestId('mail-option-COBO'));

    await screen.findByText('Send CoBo Information');
    const boxes = screen.getAllByRole('checkbox').filter(b => b.closest('label')?.textContent?.includes('.pdf'));
    expect(boxes).toHaveLength(2);
    boxes.forEach(b => expect(b).not.toBeChecked());
  });

  it('sends the CoBo mail with the chosen attachments and the CoBo mail type', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({
      ...sampleReservation, specialActivities: ['COBO'],
    });
    vi.mocked(sendReservationMail).mockResolvedValueOnce({ status: 'sent', message: 'ok' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('send-mail'));
    fireEvent.click(screen.getByTestId('mail-option-COBO'));

    await screen.findByText('Send CoBo Information');
    // Tick just the contract.
    const contractBox = screen.getAllByRole('checkbox')
      .find(b => b.closest('label')?.textContent?.includes('cobo.pdf'))!;
    fireEvent.click(contractBox);

    fireEvent.click(screen.getByRole('button', { name: /Send Email/i }));

    await waitFor(() => expect(sendReservationMail).toHaveBeenCalledWith(
      1, 'COBO', expect.objectContaining({ attachmentIds: [2] })));
  });

  it('requests the preview for the chosen mail type', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({
      ...sampleReservation, specialActivities: ['COBO'],
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('send-mail'));
    fireEvent.click(screen.getByTestId('mail-option-COBO'));

    await waitFor(() => expect(fetchMailPreview).toHaveBeenCalledWith(1, 'COBO'));
  });

  it('closes the mail menu on Escape', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({
      ...sampleReservation, specialActivities: ['COBO'],
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    fireEvent.click(screen.getByTestId('send-mail'));
    expect(screen.getByTestId('mail-menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByTestId('mail-menu')).not.toBeInTheDocument();
  });
});

describe('ReservationDetailPage — CoBo contract signed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is hidden for a reservation without the CoBo activity', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({
      ...sampleReservation, specialActivities: ['EAT_CATERING'],
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    expect(screen.queryByTestId('cobo-contract-toggle')).not.toBeInTheDocument();
  });

  it('shows an unsigned CoBo contract and marks it signed', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({
      ...sampleReservation, specialActivities: ['COBO'], coboContractSigned: false,
    });
    vi.mocked(updateCoboContractSigned).mockResolvedValueOnce({
      ...sampleReservation, coboContractSigned: true,
    });

    renderPage();
    const toggle = await screen.findByTestId('cobo-contract-toggle', {}, { timeout: 3000 });
    expect(toggle).toHaveTextContent('Not signed yet');

    fireEvent.click(toggle);

    await waitFor(() => expect(updateCoboContractSigned).toHaveBeenCalledWith(1, true));
    await waitFor(() => expect(screen.getByTestId('cobo-contract-toggle')).toHaveTextContent('Signed ✓'));
  });

  it('unsets a signed contract', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({
      ...sampleReservation, specialActivities: ['COBO'], coboContractSigned: true,
    });
    vi.mocked(updateCoboContractSigned).mockResolvedValueOnce({
      ...sampleReservation, coboContractSigned: false,
    });

    renderPage();
    const toggle = await screen.findByTestId('cobo-contract-toggle', {}, { timeout: 3000 });
    expect(toggle).toHaveTextContent('Signed ✓');

    fireEvent.click(toggle);

    await waitFor(() => expect(updateCoboContractSigned).toHaveBeenCalledWith(1, false));
  });

  /** Informational only: it must not be tangled up with the reservation's status. */
  it('does not change the reservation status', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({
      ...sampleReservation, specialActivities: ['COBO'], coboContractSigned: false,
    });
    vi.mocked(updateCoboContractSigned).mockResolvedValueOnce({
      ...sampleReservation, coboContractSigned: true,
    });

    renderPage();
    const toggle = await screen.findByTestId('cobo-contract-toggle', {}, { timeout: 3000 });
    fireEvent.click(toggle);

    await waitFor(() => expect(updateCoboContractSigned).toHaveBeenCalled());
    expect(updateReservationStatus).not.toHaveBeenCalled();
    expect(screen.getByTestId('reservation-status')).toHaveTextContent('CONFIRMED');
  });
});

describe('ReservationDetailPage — seating area indicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an "Inside" badge in read mode without opening the editor', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, seatingArea: 'INSIDE' });

    renderPage();

    const badge = await screen.findByTestId('seating-area-badge', {}, { timeout: 3000 });
    expect(badge).toHaveTextContent('Inside');
  });

  it('shows an "Outside" badge in read mode', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, seatingArea: 'OUTSIDE' });

    renderPage();

    const badge = await screen.findByTestId('seating-area-badge', {}, { timeout: 3000 });
    expect(badge).toHaveTextContent('Outside');
  });

  it('hides the badge when no seating area is stored', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, seatingArea: undefined });

    renderPage();
    await waitFor(() => expect(screen.getByText('Birthday Party')).toBeInTheDocument(), { timeout: 3000 });

    expect(screen.queryByTestId('seating-area-badge')).not.toBeInTheDocument();
  });
});

describe('ReservationDetailPage — edit email default', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults the "send update email" checkbox to off when editing', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('edit-reservation')).toBeInTheDocument(), { timeout: 3000 });

    fireEvent.click(screen.getByTestId('edit-reservation'));

    const sendEmailCheckbox = await screen.findByRole('checkbox', {
      name: /send email notification about changes/i,
    });
    expect(sendEmailCheckbox).not.toBeChecked();
  });

  it('saves an edit with sendEmail=false unless the box is ticked', async () => {
    vi.mocked(updateReservation).mockResolvedValueOnce(sampleReservation);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('edit-reservation')).toBeInTheDocument(), { timeout: 3000 });

    fireEvent.click(screen.getByTestId('edit-reservation'));
    await screen.findByTestId('edit-save');
    fireEvent.click(screen.getByTestId('edit-save'));

    await waitFor(() =>
      expect(updateReservation).toHaveBeenCalledWith(1, expect.any(Object), false, undefined));
  });

  // ==================== GUEST COUNT (regression) ====================

  it('renders a reservation whose guest count is missing instead of crashing', async () => {
    // A row saved before the guest count was mandatory. An unguarded
    // expectedGuests.toString() used to throw here and take the whole page down,
    // leaving no way to open the reservation and repair it.
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, expectedGuests: null });

    renderPage();

    await waitFor(() => expect(screen.getByText('Birthday Party')).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText('Not specified')).toBeInTheDocument();
  });

  it('never puts NaN in the guest count when the field is cleared', async () => {
    vi.mocked(updateReservation).mockResolvedValueOnce(sampleReservation);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('edit-reservation')).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('edit-reservation'));

    const guests = await screen.findByTestId('edit-guests');
    fireEvent.change(guests, { target: { value: '' } });
    fireEvent.click(screen.getByTestId('edit-save'));

    // NaN would serialise to null over the wire and silently blank the field.
    await waitFor(() => expect(updateReservation).toHaveBeenCalled());
    const payload = vi.mocked(updateReservation).mock.calls[0][1] as { expectedGuests?: number };
    expect(payload.expectedGuests).toBeUndefined();
    expect(Number.isNaN(payload.expectedGuests as number)).toBe(false);
  });

  it('keeps a valid guest count as an integer', async () => {
    vi.mocked(updateReservation).mockResolvedValueOnce(sampleReservation);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('edit-reservation')).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('edit-reservation'));

    const guests = await screen.findByTestId('edit-guests');
    fireEvent.change(guests, { target: { value: '137' } });
    fireEvent.click(screen.getByTestId('edit-save'));

    await waitFor(() => expect(updateReservation).toHaveBeenCalled());
    const payload = vi.mocked(updateReservation).mock.calls[0][1] as { expectedGuests?: number };
    expect(payload.expectedGuests).toBe(137);
  });
});
