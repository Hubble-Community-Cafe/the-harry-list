import { describe, it, expect } from 'vitest';
import { formatEventDate } from './formatDate';

describe('formatEventDate', () => {
  it('writes the weekday, day, month and year in British order', () => {
    expect(formatEventDate('2026-11-30')).toBe('Monday 30 November 2026');
    expect(formatEventDate('2030-01-05')).toBe('Saturday 5 January 2030');
  });

  it('handles a leap day', () => {
    expect(formatEventDate('2028-02-29')).toBe('Tuesday 29 February 2028');
  });

  it('returns anything that is not a valid date unchanged', () => {
    expect(formatEventDate('')).toBe('');
    expect(formatEventDate(undefined)).toBe('');
    expect(formatEventDate('2026-02-30')).toBe('2026-02-30');
    expect(formatEventDate('30-11-2026')).toBe('30-11-2026');
  });
});
