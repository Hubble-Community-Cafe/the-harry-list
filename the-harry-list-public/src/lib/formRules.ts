import type { FormConstraint } from '../types/reservation';

// The reservation form's rules, as plain functions of the staff-configured constraints and
// the guest's answers. No React here: ReservationForm calls evaluateFormRules() on every
// change and renders the result.

/** Groups smaller than this can only book at Meteor. */
export const SMALL_GROUP_LIMIT = 8;
/** Reservations longer than this (in minutes) must give a reason. */
export const LONG_RESERVATION_MINUTES = 180;

export interface FormAnswers {
  activities: string[];
  guests: number | undefined;
  location: string | null | undefined;
  startTime: string | undefined;
  endTime: string | undefined;
}

export interface FormRules {
  /** The bar the booking is fixed to, or null when the guest may choose. */
  locationLock: string | null;
  /** Why the group size and an activity's bar cannot both be met; blocks the step. */
  locationConflict: string | null;
  /** The seating area the booking is fixed to, or null. */
  seatingLock: string | null;
  /** An activity's guest limit that is exceeded; blocks the step. */
  guestLimitWarning: string | null;
  minGuests: number;
  /** Days ahead the selected activities must be booked; 0 when there is no such rule. */
  advanceBookingDays: number;
  startTimes: string[];
  endTimes: string[];
  startTimeWarning: string | null;
  durationMinutes: number;
  /** Long bookings must explain why. */
  needsLongReservationReason: boolean;
  /** Catering activities ask for dietary notes. */
  asksForDietaryNotes: boolean;
  /** For each activity, the activities it cannot be combined with. */
  activityConflicts: Record<string, string[]>;
}

export function evaluateFormRules(constraints: FormConstraint[], answers: FormAnswers): FormRules {
  const { activities, guests, location, startTime, endTime } = answers;
  const durationMinutes = reservationMinutes(startTime, endTime);
  return {
    locationLock: locationLock(constraints, activities, guests),
    locationConflict: locationConflict(constraints, activities, guests),
    seatingLock: lockFor('SEATING_LOCK', constraints, activities),
    guestLimitWarning: guestLimitWarning(constraints, activities, guests),
    minGuests: minGuests(constraints, location),
    advanceBookingDays: advanceBookingDays(constraints, activities),
    startTimes: startTimes(constraints, activities),
    endTimes: endTimesAfter(startTime),
    startTimeWarning: startTimeWarning(startTime),
    durationMinutes,
    needsLongReservationReason: durationMinutes > LONG_RESERVATION_MINUTES,
    asksForDietaryNotes: activities.includes('EAT_CATERING') || activities.includes('CATERING_CORONA_ROOM'),
    activityConflicts: activityConflicts(constraints),
  };
}

/** True when {@code activity} cannot be added next to the already selected ones. */
export function isActivityBlocked(conflicts: Record<string, string[]>, activity: string, selected: string[]): boolean {
  return (conflicts[activity] || []).some(conflict => selected.includes(conflict));
}

/** The first allowed event date, as yyyy-mm-dd, given the advance booking rule. */
export function minBookingDate(advanceDays: number, today: Date = new Date()): string {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  if (advanceDays > 0) d.setDate(d.getDate() + advanceDays);
  return d.toISOString().split('T')[0];
}

function lockFor(type: 'LOCATION_LOCK' | 'SEATING_LOCK', constraints: FormConstraint[], activities: string[]): string | null {
  for (const c of constraints) {
    if (c.constraintType === type && activities.includes(c.triggerActivity)) {
      return c.targetValue || null;
    }
  }
  return null;
}

function locationLock(constraints: FormConstraint[], activities: string[], guests: number | undefined): string | null {
  const byActivity = lockFor('LOCATION_LOCK', constraints, activities);
  if (byActivity) return byActivity;
  if (guests !== undefined && guests >= 1 && guests < SMALL_GROUP_LIMIT) return 'METEOR';
  return null;
}

function locationConflict(constraints: FormConstraint[], activities: string[], guests: number | undefined): string | null {
  if (!guests || guests >= SMALL_GROUP_LIMIT) return null;
  for (const c of constraints) {
    if (c.constraintType === 'LOCATION_LOCK' && activities.includes(c.triggerActivity)
        && c.targetValue && c.targetValue !== 'METEOR') {
      return `Reservations under ${SMALL_GROUP_LIMIT} guests are only available at Meteor, but the selected activity requires ${c.targetValue}. Please increase the number of guests or remove the incompatible activity.`;
    }
  }
  return null;
}

function guestLimitWarning(constraints: FormConstraint[], activities: string[], guests: number | undefined): string | null {
  for (const c of constraints) {
    if (c.constraintType === 'GUEST_LIMIT' && activities.includes(c.triggerActivity)
        && c.numericValue && guests !== undefined && guests > c.numericValue) {
      return c.message;
    }
  }
  return null;
}

function minGuests(constraints: FormConstraint[], location: string | null | undefined): number {
  let min = 1;
  for (const c of constraints) {
    if (c.constraintType === 'GUEST_MINIMUM' && c.numericValue !== undefined) {
      const appliesToLocation = !c.targetValue || c.targetValue === location;
      if (appliesToLocation && c.numericValue < min) min = c.numericValue;
    }
  }
  return min;
}

function advanceBookingDays(constraints: FormConstraint[], activities: string[]): number {
  let maxDays = 0;
  for (const c of constraints) {
    if (c.constraintType === 'ADVANCE_BOOKING' && activities.includes(c.triggerActivity)
        && c.numericValue && c.numericValue > maxDays) {
      maxDays = c.numericValue;
    }
  }
  return maxDays;
}

/** Quarter-hour slots from {@code startHour} up to {@code endHour}:00, optionally past midnight. */
export function timeSlots(startHour: number, endHour: number, crossesMidnight: boolean): string[] {
  const times: string[] = [];
  const slot = (h: number, m: number) => `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  if (crossesMidnight) {
    for (let h = startHour; h <= 23; h++) {
      for (let m = 0; m < 60; m += 15) times.push(slot(h, m));
    }
    for (let h = 0; h <= endHour; h++) {
      const maxM = h === endHour ? 0 : 45;
      for (let m = 0; m <= maxM; m += 15) times.push(slot(h, m));
    }
  } else {
    for (let h = startHour; h <= endHour; h++) {
      const maxM = h === endHour ? 0 : 45;
      for (let m = 0; m <= maxM; m += 15) times.push(slot(h, m));
    }
  }
  return times;
}

/** Bookings start from 11:00, or 09:00 for activities with an EARLY_ACCESS time rule. */
function startTimes(constraints: FormConstraint[], activities: string[]): string[] {
  const earlyAccess = constraints.some(c => c.constraintType === 'TIME_RESTRICTION'
    && c.targetValue === 'EARLY_ACCESS' && activities.includes(c.triggerActivity));
  return timeSlots(earlyAccess ? 9 : 11, 2, true);
}

/** End times strictly after the start; the day runs from 09:00 to 02:00 the next morning. */
function endTimesAfter(startTime: string | undefined): string[] {
  const all = timeSlots(9, 2, true);
  if (!startTime) return all;
  const start = minutesInBarDay(startTime);
  return all.filter(t => minutesInBarDay(t) > start);
}

function minutesInBarDay(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h < 9 ? h * 60 + m + 1440 : h * 60 + m;
}

function startTimeWarning(startTime: string | undefined): string | null {
  if (!startTime) return null;
  const [h, m] = startTime.split(':').map(Number);
  const mins = h * 60 + m;
  if (mins >= 11 * 60 && mins < 12 * 60) {
    return 'Kitchen opens at 12:00 - food may not be available at this time.';
  }
  if (mins >= 19 * 60 + 30 || (h < 3 && mins >= 0)) {
    return 'Kitchen is closed from 19:30 to 20:30 and only open for snacks after that.';
  }
  return null;
}

/** Length of the booking in minutes; an end before the start runs past midnight. */
function reservationMinutes(startTime: string | undefined, endTime: string | undefined): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const start = sh * 60 + sm;
  let end = eh * 60 + em;
  if (end <= start) end += 24 * 60;
  return end - start;
}

function activityConflicts(constraints: FormConstraint[]): Record<string, string[]> {
  const conflicts: Record<string, string[]> = {};
  for (const c of constraints) {
    if (c.constraintType === 'ACTIVITY_CONFLICT' && c.targetValue) {
      (conflicts[c.triggerActivity] ||= []).push(c.targetValue);
    }
  }
  return conflicts;
}
