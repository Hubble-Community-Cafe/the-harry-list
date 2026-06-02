import { describe, it, expect } from 'vitest';
import type { BlockedPeriod } from '../types/reservation';
import {
  checkBlockedDate,
  DEFAULT_SOFT_BLOCK_ACKNOWLEDGEMENT,
  DEFAULT_SOFT_BLOCK_MESSAGE,
} from '../lib/blockedPeriods';

/**
 * Tests for the blocked period date checking logic used in ReservationForm.
 * Exercises the shared helper the component itself uses.
 */

describe('Blocked period date validation', () => {
  const samplePeriods: BlockedPeriod[] = [
    {
      id: 1,
      location: 'HUBBLE',
      startDate: '2026-04-01',
      endDate: '2026-04-03',
      reason: 'Maintenance',
      publicMessage: 'Closed for maintenance from April 1-3',
      enabled: true,
    },
    {
      id: 2,
      startDate: '2026-12-25',
      endDate: '2026-12-26',
      reason: 'Christmas',
      publicMessage: 'Closed for Christmas',
      enabled: true,
    },
  ];

  it('returns null when no blocked periods exist', () => {
    expect(checkBlockedDate('2026-04-02', 'HUBBLE', [])).toBeNull();
  });

  it('returns null when no event date is provided', () => {
    expect(checkBlockedDate('', 'HUBBLE', samplePeriods)).toBeNull();
  });

  it('returns warning when date falls within a location-specific blocked period', () => {
    const result = checkBlockedDate('2026-04-02', 'HUBBLE', samplePeriods);
    expect(result?.message).toBe('Closed for maintenance from April 1-3');
    expect(result?.soft).toBe(false);
  });

  it('returns null when date is in blocked period but for a different location', () => {
    expect(checkBlockedDate('2026-04-02', 'METEOR', samplePeriods)).toBeNull();
  });

  it('returns warning for global blocked period regardless of location', () => {
    expect(checkBlockedDate('2026-12-25', 'METEOR', samplePeriods)?.message).toBe('Closed for Christmas');
  });

  it('returns warning for global blocked period with HUBBLE location', () => {
    expect(checkBlockedDate('2026-12-26', 'HUBBLE', samplePeriods)?.message).toBe('Closed for Christmas');
  });

  it('skips location-specific block when user has NO_PREFERENCE', () => {
    expect(checkBlockedDate('2026-04-01', 'NO_PREFERENCE', samplePeriods)).toBeNull();
  });

  it('skips location-specific block when location is empty string (No Preference)', () => {
    expect(checkBlockedDate('2026-04-01', '', samplePeriods)).toBeNull();
  });

  it('skips location-specific block when location is null', () => {
    expect(checkBlockedDate('2026-04-01', null, samplePeriods)).toBeNull();
  });

  it('returns null when date is outside all blocked periods', () => {
    expect(checkBlockedDate('2026-05-15', 'HUBBLE', samplePeriods)).toBeNull();
  });

  it('matches on exact start date', () => {
    expect(checkBlockedDate('2026-04-01', 'HUBBLE', samplePeriods)?.message).toBe('Closed for maintenance from April 1-3');
  });

  it('matches on exact end date', () => {
    expect(checkBlockedDate('2026-04-03', 'HUBBLE', samplePeriods)?.message).toBe('Closed for maintenance from April 1-3');
  });

  it('returns default message when publicMessage is not set', () => {
    const periodsNoMessage: BlockedPeriod[] = [
      {
        id: 3,
        startDate: '2026-06-01',
        endDate: '2026-06-01',
        reason: 'Internal reason',
        enabled: true,
      },
    ];
    expect(checkBlockedDate('2026-06-01', 'HUBBLE', periodsNoMessage)?.message)
      .toBe('This date is not available for reservations.');
  });
});

describe('Blocked period time-specific validation', () => {
  const timeSpecificPeriods: BlockedPeriod[] = [
    {
      id: 10,
      startDate: '2026-05-01',
      endDate: '2026-05-01',
      startTime: '09:00',
      endTime: '14:00',
      reason: 'Morning maintenance',
      publicMessage: 'Not available in the morning',
      enabled: true,
    },
    {
      id: 11,
      startDate: '2026-05-10',
      endDate: '2026-05-10',
      reason: 'Full day closure',
      publicMessage: 'Closed all day',
      enabled: true,
    },
  ];

  it('blocks when start time falls within blocked time window', () => {
    expect(checkBlockedDate('2026-05-01', 'HUBBLE', timeSpecificPeriods, '10:00')?.message)
      .toBe('Not available in the morning');
  });

  it('blocks at exact start of blocked time window', () => {
    expect(checkBlockedDate('2026-05-01', 'HUBBLE', timeSpecificPeriods, '09:00')?.message)
      .toBe('Not available in the morning');
  });

  it('does not block when start time is at or after the blocked end time', () => {
    expect(checkBlockedDate('2026-05-01', 'HUBBLE', timeSpecificPeriods, '14:00')).toBeNull();
  });

  it('does not block when start time is after blocked time window', () => {
    expect(checkBlockedDate('2026-05-01', 'HUBBLE', timeSpecificPeriods, '15:00')).toBeNull();
  });

  it('does not block when start time is before blocked time window', () => {
    expect(checkBlockedDate('2026-05-01', 'HUBBLE', timeSpecificPeriods, '08:30')).toBeNull();
  });

  it('does not block time-specific period when no start time selected', () => {
    expect(checkBlockedDate('2026-05-01', 'HUBBLE', timeSpecificPeriods)).toBeNull();
  });

  it('blocks full-day period regardless of start time', () => {
    expect(checkBlockedDate('2026-05-10', 'HUBBLE', timeSpecificPeriods, '10:00')?.message).toBe('Closed all day');
  });

  it('blocks full-day period when no start time selected', () => {
    expect(checkBlockedDate('2026-05-10', 'HUBBLE', timeSpecificPeriods)?.message).toBe('Closed all day');
  });
});

describe('Soft blocked periods', () => {
  const softPeriod: BlockedPeriod = {
    id: 20,
    startDate: '2026-07-01',
    endDate: '2026-08-31',
    reason: 'Summer closing',
    publicMessage: 'The bar is closed by default this summer, but you can request a reservation.',
    softBlock: true,
    acknowledgementText: 'I understand the bar may be closed and my booking is a request',
    enabled: true,
  };

  it('flags a soft block as soft and surfaces the public message', () => {
    const result = checkBlockedDate('2026-07-15', 'HUBBLE', [softPeriod]);
    expect(result?.soft).toBe(true);
    expect(result?.message).toBe(softPeriod.publicMessage);
  });

  it('returns the configured acknowledgement text', () => {
    const result = checkBlockedDate('2026-07-15', 'HUBBLE', [softPeriod]);
    expect(result?.acknowledgementText).toBe('I understand the bar may be closed and my booking is a request');
  });

  it('falls back to the default acknowledgement text when none is configured', () => {
    const result = checkBlockedDate('2026-07-15', 'HUBBLE', [{ ...softPeriod, acknowledgementText: undefined }]);
    expect(result?.acknowledgementText).toBe(DEFAULT_SOFT_BLOCK_ACKNOWLEDGEMENT);
  });

  it('uses the soft-specific default message when no public message is set', () => {
    const result = checkBlockedDate('2026-07-15', 'HUBBLE', [{ ...softPeriod, publicMessage: undefined }]);
    expect(result?.message).toBe(DEFAULT_SOFT_BLOCK_MESSAGE);
  });

  it('treats a period without softBlock as a hard block', () => {
    const result = checkBlockedDate('2026-07-15', 'HUBBLE', [{ ...softPeriod, softBlock: undefined }]);
    expect(result?.soft).toBe(false);
  });

  it('flags a global block as not location-specific', () => {
    expect(checkBlockedDate('2026-07-15', 'HUBBLE', [softPeriod])?.locationSpecific).toBe(false);
  });

  it('flags a location-scoped block as location-specific', () => {
    const result = checkBlockedDate('2026-07-15', 'HUBBLE', [{ ...softPeriod, location: 'HUBBLE' }]);
    expect(result?.locationSpecific).toBe(true);
  });
});
