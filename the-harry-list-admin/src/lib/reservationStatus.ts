/**
 * Reservation status metadata and the allowed workflow transitions.
 *
 * The transition map mirrors `ReservationStatusTransitions` in the backend, which is the
 * authority: the API rejects an illegal move with 400 regardless of what this file says. This
 * copy exists so the "Change Status" menu only offers moves that will actually succeed.
 * Keep the two in sync — `reservationStatus.test.ts` pins the expected shape.
 */

export type ReservationStatusValue =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export const RESERVATION_STATUSES: ReservationStatusValue[] = [
  'PENDING',
  'IN_PROGRESS',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
];

/** Human-readable label per status, matching the backend's display names. */
export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
};

/**
 * Which statuses each status may move to. Mirrors the backend matrix.
 * COMPLETED is terminal and therefore absent from every value list.
 */
export const STATUS_TRANSITIONS: Record<string, ReservationStatusValue[]> = {
  PENDING: ['IN_PROGRESS', 'CONFIRMED', 'REJECTED', 'CANCELLED'],
  IN_PROGRESS: ['CONFIRMED', 'REJECTED', 'CANCELLED', 'PENDING'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  REJECTED: ['PENDING'],
  CANCELLED: ['PENDING'],
  COMPLETED: [],
};

/**
 * Statuses that do not notify the customer. IN_PROGRESS is internal bookkeeping, so the
 * "send email" controls are hidden for it — the backend ignores the flag either way.
 */
export function statusNotifiesCustomer(status: string): boolean {
  return status !== 'IN_PROGRESS';
}

export function allowedTransitionsFrom(status: string | undefined | null): ReservationStatusValue[] {
  if (!status) return STATUS_TRANSITIONS.PENDING;
  return STATUS_TRANSITIONS[status] ?? [];
}

/** Pre-filled (editable) default shown when rejecting a reservation. Staff can edit or clear it. */
export const DEFAULT_REJECTION_MESSAGE =
  'Unfortunately we cannot host you since we do not have any places left at this time';

/**
 * Per-target copy for the confirmation dialog. `confirmLabel` is the button, `prompt` explains
 * the consequence, and `defaultMessage` pre-fills the optional note where one is useful.
 */
export interface StatusActionCopy {
  confirmLabel: string;
  prompt: string;
  defaultMessage?: string;
  /**
   * Whether the "send email" checkbox starts ticked for this target. Defaults to true;
   * set false where notifying the customer should be a deliberate opt-in.
   */
  defaultSendEmail?: boolean;
  /** Tailwind accent classes for the dialog and its confirm button. */
  accent: { panel: string; text: string; button: string };
}

export const STATUS_ACTIONS: Record<string, StatusActionCopy> = {
  IN_PROGRESS: {
    confirmLabel: 'Yes, Mark In Progress',
    prompt:
      'Mark this reservation as being worked on? This is internal only, the customer is not notified.',
    accent: {
      panel: 'bg-indigo-500/10 border-indigo-500/50',
      text: 'text-indigo-400',
      button: 'bg-indigo-500 hover:bg-indigo-600',
    },
  },
  CONFIRMED: {
    confirmLabel: 'Yes, Confirm Reservation',
    prompt: 'Are you sure you want to confirm this reservation?',
    accent: {
      panel: 'bg-green-500/10 border-green-500/50',
      text: 'text-green-400',
      button: 'bg-green-500 hover:bg-green-600',
    },
  },
  REJECTED: {
    confirmLabel: 'Yes, Reject Reservation',
    prompt: 'Are you sure you want to reject this reservation?',
    defaultMessage: DEFAULT_REJECTION_MESSAGE,
    accent: {
      panel: 'bg-red-500/10 border-red-500/50',
      text: 'text-red-400',
      button: 'bg-red-500 hover:bg-red-600',
    },
  },
  CANCELLED: {
    confirmLabel: 'Yes, Cancel Reservation',
    prompt: 'Are you sure you want to cancel this reservation?',
    accent: {
      panel: 'bg-amber-500/10 border-amber-500/50',
      text: 'text-amber-400',
      button: 'bg-amber-500 hover:bg-amber-600',
    },
  },
  COMPLETED: {
    confirmLabel: 'Yes, Mark Completed',
    prompt: 'Are you sure you want to mark this reservation as completed?',
    accent: {
      panel: 'bg-blue-500/10 border-blue-500/50',
      text: 'text-blue-400',
      button: 'bg-blue-500 hover:bg-blue-600',
    },
  },
  // Reopening: a rejected or cancelled event is often only blocked by a date or location that
  // can still be changed, so staff can edit the existing details instead of asking the customer
  // to submit everything again. Emailing about it is opt-in — the customer usually hears about
  // the outcome, not the fact that staff reopened the request internally.
  PENDING: {
    confirmLabel: 'Yes, Move to Pending',
    prompt:
      "Move this reservation back to Pending? You'll be able to edit the date, location and other details, then decide again.",
    defaultSendEmail: false,
    accent: {
      panel: 'bg-yellow-500/10 border-yellow-500/50',
      text: 'text-yellow-400',
      button: 'bg-yellow-500 hover:bg-yellow-600',
    },
  },
};
