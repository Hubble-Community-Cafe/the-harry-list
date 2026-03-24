import { describe, it, expect } from 'vitest';
import type { BlockedPeriod } from '../types/reservation';

/**
 * Tests for the blocked period date checking logic used in ReservationForm.
 * Tests the pure logic extracted from the component's useMemo.
 */

function checkBlockedDate(
  eventDate: string,
  location: string | null | undefined,
  blockedPeriods: BlockedPeriod[],
  startTime?: string
): string | null {
  if (!eventDate || blockedPeriods.length === 0) return null;
  for (const bp of blockedPeriods) {
    if (eventDate >= bp.startDate && eventDate <= bp.endDate) {
      if (bp.location) {
        // Location-specific block: only warn if user selected that exact location
        if (!location || location === 'NO_PREFERENCE' || location === '' || bp.location !== location) {
          continue;
        }
      }
      // Time-specific block: only warn if user's start time falls within the blocked window
      if (bp.startTime && bp.endTime) {
        if (!startTime || startTime < bp.startTime || startTime >= bp.endTime) {
          continue;
        }
      }
      return bp.publicMessage || 'This date is not available for reservations.';
    }
  }
  return null;
}

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
    expect(result).toBe('Closed for maintenance from April 1-3');
  });

  it('returns null when date is in blocked period but for a different location', () => {
    const result = checkBlockedDate('2026-04-02', 'METEOR', samplePeriods);
    expect(result).toBeNull();
  });

  it('returns warning for global blocked period regardless of location', () => {
    const result = checkBlockedDate('2026-12-25', 'METEOR', samplePeriods);
    expect(result).toBe('Closed for Christmas');
  });

  it('returns warning for global blocked period with HUBBLE location', () => {
    const result = checkBlockedDate('2026-12-26', 'HUBBLE', samplePeriods);
    expect(result).toBe('Closed for Christmas');
  });

  it('skips location-specific block when user has NO_PREFERENCE', () => {
    const result = checkBlockedDate('2026-04-01', 'NO_PREFERENCE', samplePeriods);
    expect(result).toBeNull();
  });

  it('skips location-specific block when location is empty string (No Preference)', () => {
    // The form uses value="" for the "No Preference" radio
    const result = checkBlockedDate('2026-04-01', '', samplePeriods);
    expect(result).toBeNull();
  });

  it('skips location-specific block when location is null', () => {
    const result = checkBlockedDate('2026-04-01', null, samplePeriods);
    expect(result).toBeNull();
  });

  it('returns null when date is outside all blocked periods', () => {
    expect(checkBlockedDate('2026-05-15', 'HUBBLE', samplePeriods)).toBeNull();
  });

  it('matches on exact start date', () => {
    const result = checkBlockedDate('2026-04-01', 'HUBBLE', samplePeriods);
    expect(result).toBe('Closed for maintenance from April 1-3');
  });

  it('matches on exact end date', () => {
    const result = checkBlockedDate('2026-04-03', 'HUBBLE', samplePeriods);
    expect(result).toBe('Closed for maintenance from April 1-3');
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
    const result = checkBlockedDate('2026-06-01', 'HUBBLE', periodsNoMessage);
    expect(result).toBe('This date is not available for reservations.');
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
    const result = checkBlockedDate('2026-05-01', 'HUBBLE', timeSpecificPeriods, '10:00');
    expect(result).toBe('Not available in the morning');
  });

  it('blocks at exact start of blocked time window', () => {
    const result = checkBlockedDate('2026-05-01', 'HUBBLE', timeSpecificPeriods, '09:00');
    expect(result).toBe('Not available in the morning');
  });

  it('does not block when start time is at or after the blocked end time', () => {
    const result = checkBlockedDate('2026-05-01', 'HUBBLE', timeSpecificPeriods, '14:00');
    expect(result).toBeNull();
  });

  it('does not block when start time is after blocked time window', () => {
    const result = checkBlockedDate('2026-05-01', 'HUBBLE', timeSpecificPeriods, '15:00');
    expect(result).toBeNull();
  });

  it('does not block when start time is before blocked time window', () => {
    const result = checkBlockedDate('2026-05-01', 'HUBBLE', timeSpecificPeriods, '08:30');
    expect(result).toBeNull();
  });

  it('does not block time-specific period when no start time selected', () => {
    const result = checkBlockedDate('2026-05-01', 'HUBBLE', timeSpecificPeriods);
    expect(result).toBeNull();
  });

  it('blocks full-day period regardless of start time', () => {
    const result = checkBlockedDate('2026-05-10', 'HUBBLE', timeSpecificPeriods, '10:00');
    expect(result).toBe('Closed all day');
  });

  it('blocks full-day period when no start time selected', () => {
    const result = checkBlockedDate('2026-05-10', 'HUBBLE', timeSpecificPeriods);
    expect(result).toBe('Closed all day');
  });
});
