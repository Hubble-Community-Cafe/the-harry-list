import { describe, it, expect } from 'vitest';
import {
  RESERVATION_STATUSES,
  STATUS_ACTIONS,
  STATUS_LABELS,
  STATUS_TRANSITIONS,
  allowedTransitionsFrom,
  statusNotifiesCustomer,
} from '../lib/reservationStatus';

/**
 * This map mirrors ReservationStatusTransitions in the backend. If the two drift, the admin
 * offers a move the API rejects with 400 (or hides one that is legal), so the expected shape is
 * pinned here rather than merely spot-checked.
 */
describe('reservation status transitions', () => {
  it('matches the backend matrix exactly', () => {
    expect(STATUS_TRANSITIONS).toEqual({
      PENDING: ['IN_PROGRESS', 'CONFIRMED', 'REJECTED', 'CANCELLED'],
      IN_PROGRESS: ['CONFIRMED', 'REJECTED', 'CANCELLED', 'PENDING'],
      CONFIRMED: ['COMPLETED', 'CANCELLED'],
      REJECTED: ['PENDING'],
      CANCELLED: ['PENDING'],
      COMPLETED: [],
    });
  });

  it('declares a transition list for every known status', () => {
    for (const status of RESERVATION_STATUSES) {
      expect(STATUS_TRANSITIONS[status]).toBeDefined();
    }
  });

  it('only ever targets known statuses', () => {
    for (const targets of Object.values(STATUS_TRANSITIONS)) {
      for (const target of targets) {
        expect(RESERVATION_STATUSES).toContain(target);
      }
    }
  });

  it('never offers a no-op transition to the current status', () => {
    for (const [from, targets] of Object.entries(STATUS_TRANSITIONS)) {
      expect(targets).not.toContain(from);
    }
  });

  it('treats COMPLETED as terminal', () => {
    expect(allowedTransitionsFrom('COMPLETED')).toEqual([]);
  });

  it('makes COMPLETED reachable only from CONFIRMED', () => {
    const sources = Object.entries(STATUS_TRANSITIONS)
      .filter(([, targets]) => targets.includes('COMPLETED'))
      .map(([from]) => from);
    expect(sources).toEqual(['CONFIRMED']);
  });

  it('falls back to the PENDING transitions for a missing status', () => {
    expect(allowedTransitionsFrom(undefined)).toEqual(STATUS_TRANSITIONS.PENDING);
    expect(allowedTransitionsFrom(null)).toEqual(STATUS_TRANSITIONS.PENDING);
  });

  it('returns nothing for a status it does not know', () => {
    expect(allowedTransitionsFrom('NOT_A_STATUS')).toEqual([]);
  });

  it('keeps every transition the admin could already perform before IN_PROGRESS existed', () => {
    expect(STATUS_TRANSITIONS.PENDING).toContain('CONFIRMED');
    expect(STATUS_TRANSITIONS.PENDING).toContain('REJECTED');
    expect(STATUS_TRANSITIONS.CONFIRMED).toContain('COMPLETED');
    expect(STATUS_TRANSITIONS.CONFIRMED).toContain('CANCELLED');
    expect(STATUS_TRANSITIONS.REJECTED).toContain('PENDING');
  });
});

describe('customer notification', () => {
  it('treats IN_PROGRESS as the only internal-only status', () => {
    for (const status of RESERVATION_STATUSES) {
      expect(statusNotifiesCustomer(status)).toBe(status !== 'IN_PROGRESS');
    }
  });

  it('makes reopening to pending an opt-in email', () => {
    expect(STATUS_ACTIONS.PENDING.defaultSendEmail).toBe(false);
  });

  it('leaves the email on by default for every customer-facing decision', () => {
    for (const status of ['CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED']) {
      expect(STATUS_ACTIONS[status].defaultSendEmail).toBeUndefined();
    }
  });
});

describe('status presentation', () => {
  it('has a label for every status', () => {
    for (const status of RESERVATION_STATUSES) {
      expect(STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it('has dialog copy for every status that can be moved to', () => {
    const targets = new Set(Object.values(STATUS_TRANSITIONS).flat());
    for (const target of targets) {
      expect(STATUS_ACTIONS[target]).toBeDefined();
      expect(STATUS_ACTIONS[target].confirmLabel).toBeTruthy();
      expect(STATUS_ACTIONS[target].prompt).toBeTruthy();
    }
  });

  it('only pre-fills a default message for rejections', () => {
    const withDefaults = Object.entries(STATUS_ACTIONS)
      .filter(([, copy]) => copy.defaultMessage)
      .map(([status]) => status);
    expect(withDefaults).toEqual(['REJECTED']);
  });
});
