import type { CalendarAppointment, DayOfWeek, RecurrenceType } from '../types/reservation';

/**
 * Single source of truth for recurrence semantics on the admin frontend.
 *
 * Mirrors the backend's structured recurrence model (see RecurrenceType.java /
 * ICalendarService.buildRecurrenceRule): a frequency family plus optional
 * "every N" interval and, for MONTHLY_NTH_WEEKDAY, an ordinal week + weekday.
 *
 * New recurrence patterns should be added here (option metadata + expander)
 * and in the backend RRULE mapper — not scattered across pages.
 */

// ── Weekday metadata ──────────────────────────────────────────────────────────
// DayOfWeek values match the backend (java.time.DayOfWeek names). jsDay is the
// index returned by Date.getDay() (0 = Sunday … 6 = Saturday).
export const WEEKDAYS: { value: DayOfWeek; label: string; jsDay: number }[] = [
  { value: 'MONDAY', label: 'Monday', jsDay: 1 },
  { value: 'TUESDAY', label: 'Tuesday', jsDay: 2 },
  { value: 'WEDNESDAY', label: 'Wednesday', jsDay: 3 },
  { value: 'THURSDAY', label: 'Thursday', jsDay: 4 },
  { value: 'FRIDAY', label: 'Friday', jsDay: 5 },
  { value: 'SATURDAY', label: 'Saturday', jsDay: 6 },
  { value: 'SUNDAY', label: 'Sunday', jsDay: 0 },
];

const JS_DAY_BY_WEEKDAY: Record<DayOfWeek, number> = WEEKDAYS.reduce(
  (acc, w) => ({ ...acc, [w.value]: w.jsDay }),
  {} as Record<DayOfWeek, number>,
);

// Ordinal options for "on the Nth <weekday>" (-1 = last).
export const WEEK_OF_MONTH_OPTIONS: { value: number; label: string; ordinal: string }[] = [
  { value: 1, label: 'First', ordinal: '1st' },
  { value: 2, label: 'Second', ordinal: '2nd' },
  { value: 3, label: 'Third', ordinal: '3rd' },
  { value: 4, label: 'Fourth', ordinal: '4th' },
  { value: -1, label: 'Last', ordinal: 'last' },
];

// Frequency picker for the guided builder. Note BIWEEKLY is intentionally absent:
// it is represented as WEEKLY with interval 2 (see normalizeForEditing).
export const FREQUENCY_OPTIONS: { value: RecurrenceType; label: string; unitLabel: string }[] = [
  { value: 'NONE', label: 'Does not repeat', unitLabel: '' },
  { value: 'DAILY', label: 'Daily', unitLabel: 'day' },
  { value: 'WEEKLY', label: 'Weekly', unitLabel: 'week' },
  { value: 'MONTHLY', label: 'Monthly', unitLabel: 'month' },
  { value: 'YEARLY', label: 'Yearly', unitLabel: 'year' },
];

// ── Date helpers (local-time, yyyy-mm-dd) ─────────────────────────────────────
export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

const ordinalFor = (week: number) =>
  WEEK_OF_MONTH_OPTIONS.find(o => o.value === week)?.ordinal ?? `${week}`;

const weekdayLabel = (day: DayOfWeek) =>
  WEEKDAYS.find(w => w.value === day)?.label ?? day;

/**
 * Computes the date of the Nth weekday of a given month, e.g. the 2nd Friday.
 * Returns null when the occurrence does not exist (e.g. a 5th Friday in a month
 * that only has four). week: 1–4 = first–fourth, -1 = last.
 */
export function nthWeekdayOfMonth(
  year: number,
  monthIndex: number, // 0-based
  week: number,
  jsDay: number,
): Date | null {
  if (week === -1) {
    const lastDay = new Date(year, monthIndex + 1, 0); // last day of month
    const offset = (lastDay.getDay() - jsDay + 7) % 7;
    lastDay.setDate(lastDay.getDate() - offset);
    return lastDay;
  }
  const first = new Date(year, monthIndex, 1);
  const firstOffset = (jsDay - first.getDay() + 7) % 7;
  const day = 1 + firstOffset + (week - 1) * 7;
  const result = new Date(year, monthIndex, day);
  // If we overflowed into the next month, the Nth weekday doesn't exist.
  return result.getMonth() === monthIndex ? result : null;
}

/**
 * Derives a sensible "Nth weekday" default from a concrete date, e.g. 2026-06-12
 * (the 2nd Friday) → { week: 2, day: 'FRIDAY' }. A 5th occurrence collapses to
 * "last" (-1). Used to pre-fill the guided builder when switching to that mode.
 */
export function nthWeekdayFromDate(dateStr: string): { week: number; day: DayOfWeek } {
  const d = parseDate(dateStr);
  const week = Math.ceil(d.getDate() / 7);
  const day = WEEKDAYS.find(w => w.jsDay === d.getDay())!.value;
  return { week: week > 4 ? -1 : week, day };
}

/** Resolves the effective "every N" interval, defaulting to 1. */
export function effectiveInterval(appointment: CalendarAppointment): number {
  const i = appointment.recurrenceInterval;
  return i != null && i > 0 ? i : 1;
}

/**
 * Expands an appointment into the concrete dates (yyyy-mm-dd) it occurs on within
 * the inclusive [rangeStart, rangeEnd] window. Honors the appointment's start date
 * and optional recurrenceEndDate. Does NOT filter on `enabled`/location — callers
 * decide visibility. Returns sorted, unique date strings.
 */
export function expandOccurrences(
  appointment: CalendarAppointment,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const start = parseDate(appointment.date);
  const windowStart = parseDate(rangeStart);
  const windowEnd = parseDate(rangeEnd);
  const end = appointment.recurrenceEndDate ? parseDate(appointment.recurrenceEndDate) : null;

  // The latest date worth considering is the earlier of the window end and the
  // recurrence end date.
  const hardEnd = end && end < windowEnd ? end : windowEnd;
  if (hardEnd < start) return [];

  const type = appointment.recurrenceType;

  if (type === 'NONE') {
    return start >= windowStart && start <= hardEnd ? [appointment.date] : [];
  }

  if (type === 'MONTHLY_NTH_WEEKDAY') {
    return expandNthWeekday(appointment, start, windowStart, hardEnd);
  }

  return expandInterval(appointment, start, windowStart, hardEnd);
}

const MAX_ITERATIONS = 1000;

function expandInterval(
  appointment: CalendarAppointment,
  start: Date,
  windowStart: Date,
  hardEnd: Date,
): string[] {
  const interval = effectiveInterval(appointment);
  const type = appointment.recurrenceType;

  // BIWEEKLY is the legacy shorthand for "every 2 weeks"; its 14-day step bakes
  // that in, so a stored interval (typically 1) is not double-counted.
  const advance = (d: Date) => {
    switch (type) {
      case 'DAILY': d.setDate(d.getDate() + interval); break;
      case 'WEEKLY': d.setDate(d.getDate() + 7 * interval); break;
      case 'BIWEEKLY': d.setDate(d.getDate() + 14 * interval); break;
      case 'MONTHLY': d.setMonth(d.getMonth() + interval); break;
      case 'YEARLY': d.setFullYear(d.getFullYear() + interval); break;
    }
  };

  const dates: string[] = [];
  const current = new Date(start);
  let iterations = 0;

  // Fast-forward up to the window start.
  while (current < windowStart && iterations < MAX_ITERATIONS) {
    advance(current);
    iterations++;
  }

  while (current <= hardEnd && iterations < MAX_ITERATIONS) {
    if (current >= start && current >= windowStart) {
      dates.push(toDateString(current));
    }
    advance(current);
    iterations++;
  }

  return dates;
}

function expandNthWeekday(
  appointment: CalendarAppointment,
  start: Date,
  windowStart: Date,
  hardEnd: Date,
): string[] {
  const week = appointment.recurrenceWeekOfMonth;
  const day = appointment.recurrenceDayOfWeek;
  if (week == null || day == null) return [];
  const jsDay = JS_DAY_BY_WEEKDAY[day];
  const interval = effectiveInterval(appointment);

  const dates: string[] = [];
  // Walk months from the start month. Interval applies to month count since start.
  let year = start.getFullYear();
  let month = start.getMonth();
  let monthsSinceStart = 0;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    const cursorMonthStart = new Date(year, month, 1);
    if (cursorMonthStart > hardEnd) break;

    if (monthsSinceStart % interval === 0) {
      const occurrence = nthWeekdayOfMonth(year, month, week, jsDay);
      if (occurrence && occurrence >= start && occurrence >= windowStart && occurrence <= hardEnd) {
        dates.push(toDateString(occurrence));
      }
    }

    month++;
    if (month > 11) { month = 0; year++; }
    monthsSinceStart++;
    iterations++;
  }

  return dates;
}

/**
 * Human-readable summary of an appointment's recurrence, e.g. "Every 2nd Friday",
 * "Every 3 weeks", "Weekly", "Bi-weekly". Used for list/calendar badges.
 */
export function recurrenceSummary(appointment: CalendarAppointment): string {
  const type = appointment.recurrenceType;
  if (type === 'NONE') return '';
  const interval = effectiveInterval(appointment);

  if (type === 'MONTHLY_NTH_WEEKDAY') {
    const week = appointment.recurrenceWeekOfMonth;
    const day = appointment.recurrenceDayOfWeek;
    if (week == null || day == null) return 'Monthly';
    const base = `${ordinalFor(week)} ${weekdayLabel(day)}`;
    return interval > 1 ? `Every ${interval} months on the ${base}` : `Every ${base}`;
  }

  if (type === 'BIWEEKLY') return 'Bi-weekly';

  const unit = FREQUENCY_OPTIONS.find(o => o.value === type)?.unitLabel ?? '';
  if (interval > 1) return `Every ${interval} ${unit}s`;
  // interval === 1 → use the friendly frequency name
  switch (type) {
    case 'DAILY': return 'Daily';
    case 'WEEKLY': return 'Weekly';
    case 'MONTHLY': return 'Monthly';
    case 'YEARLY': return 'Yearly';
    default: return type;
  }
}
