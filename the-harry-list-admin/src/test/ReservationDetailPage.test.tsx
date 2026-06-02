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
  fetchEmailAttachments: vi.fn().mockResolvedValue([]),
  fetchCateringEmailPreview: vi.fn(),
  sendCateringEmail: vi.fn(),
}));

import { fetchReservationAuditLog, fetchReservation, updateReservationStatus } from '../lib/api';

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

    fireEvent.click(screen.getByRole('button', { name: /^Reject$/ }));

    const textarea = await screen.findByPlaceholderText(/shaded spot/i);
    expect(textarea).toHaveValue(DEFAULT_REJECTION_MESSAGE);

    fireEvent.click(screen.getByRole('button', { name: /Yes, Reject Reservation/ }));

    await waitFor(() =>
      expect(updateReservationStatus).toHaveBeenCalledWith(
        1, 'REJECTED', 'Staff Member', true, DEFAULT_REJECTION_MESSAGE));
  });

  it('sends a typed message when confirming', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'PENDING' });
    vi.mocked(updateReservationStatus).mockResolvedValueOnce({ ...sampleReservation, status: 'CONFIRMED' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    fireEvent.click(screen.getByRole('button', { name: /^Confirm$/ }));

    const textarea = await screen.findByPlaceholderText(/shaded spot/i);
    expect(textarea).toHaveValue(''); // no default for confirmations
    fireEvent.change(textarea, { target: { value: 'We saved you a spot in the shade!' } });

    fireEvent.click(screen.getByRole('button', { name: /Yes, Confirm Reservation/ }));

    await waitFor(() =>
      expect(updateReservationStatus).toHaveBeenCalledWith(
        1, 'CONFIRMED', 'Staff Member', true, 'We saved you a spot in the shade!'));
  });

  it('hides the message field when email notification is turned off', async () => {
    vi.mocked(fetchReservation).mockResolvedValueOnce({ ...sampleReservation, status: 'PENDING' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Actions')).toBeInTheDocument(), { timeout: 3000 });

    fireEvent.click(screen.getByRole('checkbox')); // turn off "send email notification"
    fireEvent.click(screen.getByRole('button', { name: /^Reject$/ }));

    expect(screen.queryByPlaceholderText(/shaded spot/i)).not.toBeInTheDocument();
  });
});
