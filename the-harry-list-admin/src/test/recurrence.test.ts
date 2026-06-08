import { describe, it, expect } from 'vitest';
import {
  nthWeekdayOfMonth,
  expandOccurrences,
  recurrenceSummary,
  effectiveInterval,
} from '../lib/recurrence';
import type { CalendarAppointment } from '../types/reservation';

function appt(overrides: Partial<CalendarAppointment>): CalendarAppointment {
  return {
    title: 'Test',
    date: '2026-06-01',
    allDay: true,
    location: 'HUBBLE',
    recurrenceType: 'NONE',
    enabled: true,
    ...overrides,
  };
}

describe('nthWeekdayOfMonth', () => {
  it('finds the 2nd Friday of June 2026', () => {
    const d = nthWeekdayOfMonth(2026, 5, 2, 5); // June, 2nd, Friday(jsDay 5)
    expect(d && `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`).toBe('2026-6-12');
  });

  it('finds the last Monday of June 2026', () => {
    const d = nthWeekdayOfMonth(2026, 5, -1, 1); // June, last, Monday(jsDay 1)
    expect(d && d.getDate()).toBe(29);
  });

  it('returns null when the requested occurrence overflows the month', () => {
    const fourth = nthWeekdayOfMonth(2026, 5, 4, 5); // 4th Friday of June exists (26th)
    expect(fourth && fourth.getDate()).toBe(26);
    // June 2026 has no 5th Friday → overflow into July → null
    const fifth = nthWeekdayOfMonth(2026, 5, 5, 5);
    expect(fifth).toBeNull();
  });
});

describe('expandOccurrences — NONE', () => {
  it('returns the single date when in range', () => {
    expect(expandOccurrences(appt({ date: '2026-06-03' }), '2026-06-01', '2026-06-07')).toEqual(['2026-06-03']);
  });
  it('returns empty when out of range', () => {
    expect(expandOccurrences(appt({ date: '2026-06-20' }), '2026-06-01', '2026-06-07')).toEqual([]);
  });
});

describe('expandOccurrences — interval frequencies', () => {
  it('DAILY every 3 days', () => {
    const a = appt({ date: '2026-06-01', recurrenceType: 'DAILY', recurrenceInterval: 3 });
    expect(expandOccurrences(a, '2026-06-01', '2026-06-10')).toEqual([
      '2026-06-01', '2026-06-04', '2026-06-07', '2026-06-10',
    ]);
  });

  it('WEEKLY every week', () => {
    const a = appt({ date: '2026-06-01', recurrenceType: 'WEEKLY' });
    expect(expandOccurrences(a, '2026-06-01', '2026-06-14')).toEqual(['2026-06-01', '2026-06-08']);
  });

  it('BIWEEKLY (legacy every-2-weeks)', () => {
    const a = appt({ date: '2026-06-01', recurrenceType: 'BIWEEKLY' });
    expect(expandOccurrences(a, '2026-06-01', '2026-07-01')).toEqual([
      '2026-06-01', '2026-06-15', '2026-06-29',
    ]);
  });

  it('WEEKLY interval 2 matches BIWEEKLY semantics', () => {
    const a = appt({ date: '2026-06-01', recurrenceType: 'WEEKLY', recurrenceInterval: 2 });
    expect(expandOccurrences(a, '2026-06-01', '2026-07-01')).toEqual([
      '2026-06-01', '2026-06-15', '2026-06-29',
    ]);
  });

  it('MONTHLY on the same day-of-month', () => {
    const a = appt({ date: '2026-01-15', recurrenceType: 'MONTHLY' });
    expect(expandOccurrences(a, '2026-03-01', '2026-03-31')).toEqual(['2026-03-15']);
  });

  it('YEARLY on the anniversary', () => {
    const a = appt({ date: '2026-01-15', recurrenceType: 'YEARLY' });
    expect(expandOccurrences(a, '2028-01-01', '2028-12-31')).toEqual(['2028-01-15']);
  });

  it('never returns dates before the start date', () => {
    const a = appt({ date: '2026-06-10', recurrenceType: 'DAILY' });
    expect(expandOccurrences(a, '2026-06-01', '2026-06-12')).toEqual([
      '2026-06-10', '2026-06-11', '2026-06-12',
    ]);
  });

  it('respects recurrenceEndDate', () => {
    const a = appt({ date: '2026-06-01', recurrenceType: 'WEEKLY', recurrenceEndDate: '2026-06-08' });
    expect(expandOccurrences(a, '2026-06-01', '2026-06-30')).toEqual(['2026-06-01', '2026-06-08']);
  });
});

describe('expandOccurrences — MONTHLY_NTH_WEEKDAY', () => {
  it('expands "2nd Friday of the month" across months', () => {
    const a = appt({
      date: '2026-06-12',
      recurrenceType: 'MONTHLY_NTH_WEEKDAY',
      recurrenceWeekOfMonth: 2,
      recurrenceDayOfWeek: 'FRIDAY',
    });
    expect(expandOccurrences(a, '2026-06-01', '2026-08-31')).toEqual([
      '2026-06-12', '2026-07-10', '2026-08-14',
    ]);
  });

  it('expands "last Monday of the month"', () => {
    const a = appt({
      date: '2026-06-29',
      recurrenceType: 'MONTHLY_NTH_WEEKDAY',
      recurrenceWeekOfMonth: -1,
      recurrenceDayOfWeek: 'MONDAY',
    });
    expect(expandOccurrences(a, '2026-06-01', '2026-07-31')).toEqual([
      '2026-06-29', '2026-07-27',
    ]);
  });

  it('honors a month interval (every other month, first Tuesday)', () => {
    const a = appt({
      date: '2026-06-02',
      recurrenceType: 'MONTHLY_NTH_WEEKDAY',
      recurrenceInterval: 2,
      recurrenceWeekOfMonth: 1,
      recurrenceDayOfWeek: 'TUESDAY',
    });
    expect(expandOccurrences(a, '2026-06-01', '2026-09-30')).toEqual([
      '2026-06-02', '2026-08-04',
    ]);
  });

  it('returns empty for incomplete config', () => {
    const a = appt({ date: '2026-06-12', recurrenceType: 'MONTHLY_NTH_WEEKDAY', recurrenceWeekOfMonth: 2 });
    expect(expandOccurrences(a, '2026-06-01', '2026-08-31')).toEqual([]);
  });
});

describe('recurrenceSummary', () => {
  it('labels simple frequencies', () => {
    expect(recurrenceSummary(appt({ recurrenceType: 'NONE' }))).toBe('');
    expect(recurrenceSummary(appt({ recurrenceType: 'WEEKLY' }))).toBe('Weekly');
    expect(recurrenceSummary(appt({ recurrenceType: 'BIWEEKLY' }))).toBe('Bi-weekly');
    expect(recurrenceSummary(appt({ recurrenceType: 'MONTHLY' }))).toBe('Monthly');
  });

  it('labels intervals', () => {
    expect(recurrenceSummary(appt({ recurrenceType: 'WEEKLY', recurrenceInterval: 3 }))).toBe('Every 3 weeks');
    expect(recurrenceSummary(appt({ recurrenceType: 'DAILY', recurrenceInterval: 2 }))).toBe('Every 2 days');
  });

  it('labels nth-weekday patterns', () => {
    expect(recurrenceSummary(appt({
      recurrenceType: 'MONTHLY_NTH_WEEKDAY', recurrenceWeekOfMonth: 2, recurrenceDayOfWeek: 'FRIDAY',
    }))).toBe('Every 2nd Friday');
    expect(recurrenceSummary(appt({
      recurrenceType: 'MONTHLY_NTH_WEEKDAY', recurrenceWeekOfMonth: -1, recurrenceDayOfWeek: 'MONDAY',
    }))).toBe('Every last Monday');
  });
});

describe('effectiveInterval', () => {
  it('defaults to 1', () => {
    expect(effectiveInterval(appt({}))).toBe(1);
    expect(effectiveInterval(appt({ recurrenceInterval: 0 }))).toBe(1);
    expect(effectiveInterval(appt({ recurrenceInterval: 4 }))).toBe(4);
  });
});
