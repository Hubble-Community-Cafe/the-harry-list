import { describe, it, expect } from 'vitest';
import type { FormConstraint } from '../types/reservation';
import { evaluateFormRules, isActivityBlocked, minBookingDate, timeSlots, type FormAnswers } from './formRules';

const constraint = (c: Partial<FormConstraint> & Pick<FormConstraint, 'constraintType'>): FormConstraint => ({
  id: Math.floor(Math.random() * 1e6), triggerActivity: '', message: '', enabled: true, ...c,
});

const answers = (a: Partial<FormAnswers> = {}): FormAnswers => ({
  activities: [], guests: 20, location: null, startTime: undefined, endTime: undefined, ...a,
});

const coronaToHubble = constraint({ constraintType: 'LOCATION_LOCK', triggerActivity: 'CATERING_CORONA_ROOM', targetValue: 'HUBBLE' });

describe('evaluateFormRules', () => {
  describe('location', () => {
    it('is free by default', () => {
      expect(evaluateFormRules([], answers()).locationLock).toBeNull();
    });

    it('locks to the bar an activity requires', () => {
      expect(evaluateFormRules([coronaToHubble], answers({ activities: ['CATERING_CORONA_ROOM'] })).locationLock).toBe('HUBBLE');
    });

    it('locks small groups to Meteor', () => {
      expect(evaluateFormRules([], answers({ guests: 7 })).locationLock).toBe('METEOR');
      expect(evaluateFormRules([], answers({ guests: 8 })).locationLock).toBeNull();
    });

    it('reports a conflict when a small group picks an activity tied to another bar', () => {
      const rules = evaluateFormRules([coronaToHubble], answers({ guests: 5, activities: ['CATERING_CORONA_ROOM'] }));
      expect(rules.locationConflict).toContain('under 8 guests are only available at Meteor');
      expect(rules.locationConflict).toContain('HUBBLE');
    });
  });

  it('locks seating to what an activity requires', () => {
    const inside = constraint({ constraintType: 'SEATING_LOCK', triggerActivity: 'GRADUATION', targetValue: 'INSIDE' });
    expect(evaluateFormRules([inside], answers({ activities: ['GRADUATION'] })).seatingLock).toBe('INSIDE');
    expect(evaluateFormRules([inside], answers()).seatingLock).toBeNull();
  });

  it('warns when an activity guest limit is exceeded', () => {
    const limit = constraint({ constraintType: 'GUEST_LIMIT', triggerActivity: 'EAT_A_LA_CARTE', numericValue: 15, message: 'Max 15' });
    expect(evaluateFormRules([limit], answers({ activities: ['EAT_A_LA_CARTE'], guests: 16 })).guestLimitWarning).toBe('Max 15');
    expect(evaluateFormRules([limit], answers({ activities: ['EAT_A_LA_CARTE'], guests: 15 })).guestLimitWarning).toBeNull();
  });

  it('lowers the guest minimum only for the bar it applies to', () => {
    const meteor = constraint({ constraintType: 'GUEST_MINIMUM', targetValue: 'METEOR', numericValue: 0 });
    expect(evaluateFormRules([meteor], answers({ location: 'METEOR' })).minGuests).toBe(0);
    expect(evaluateFormRules([meteor], answers({ location: 'HUBBLE' })).minGuests).toBe(1);
  });

  it('takes the longest advance booking of the selected activities', () => {
    const rules = evaluateFormRules([
      constraint({ constraintType: 'ADVANCE_BOOKING', triggerActivity: 'EAT_CATERING', numericValue: 14 }),
      constraint({ constraintType: 'ADVANCE_BOOKING', triggerActivity: 'GRADUATION', numericValue: 7 }),
    ], answers({ activities: ['EAT_CATERING', 'GRADUATION'] }));
    expect(rules.advanceBookingDays).toBe(14);
  });

  describe('times', () => {
    it('starts at 11:00, or 09:00 with early access', () => {
      expect(evaluateFormRules([], answers()).startTimes[0]).toBe('11:00');
      const early = constraint({ constraintType: 'TIME_RESTRICTION', triggerActivity: 'GRADUATION', targetValue: 'EARLY_ACCESS' });
      expect(evaluateFormRules([early], answers({ activities: ['GRADUATION'] })).startTimes[0]).toBe('09:00');
    });

    it('only offers end times after the start, through 02:00', () => {
      const ends = evaluateFormRules([], answers({ startTime: '23:30' })).endTimes;
      expect(ends[0]).toBe('23:45');
      expect(ends.at(-1)).toBe('02:00');
    });

    it('warns about the kitchen hours', () => {
      expect(evaluateFormRules([], answers({ startTime: '11:30' })).startTimeWarning).toContain('Kitchen opens at 12:00');
      expect(evaluateFormRules([], answers({ startTime: '20:00' })).startTimeWarning).toContain('19:30 to 20:30');
      expect(evaluateFormRules([], answers({ startTime: '14:00' })).startTimeWarning).toBeNull();
    });

    it('asks for a reason above three hours, counting past midnight', () => {
      expect(evaluateFormRules([], answers({ startTime: '18:00', endTime: '21:00' })).needsLongReservationReason).toBe(false);
      const late = evaluateFormRules([], answers({ startTime: '22:00', endTime: '01:30' }));
      expect(late.durationMinutes).toBe(210);
      expect(late.needsLongReservationReason).toBe(true);
    });
  });

  it('asks for dietary notes for catering, not for a la carte', () => {
    expect(evaluateFormRules([], answers({ activities: ['EAT_CATERING'] })).asksForDietaryNotes).toBe(true);
    expect(evaluateFormRules([], answers({ activities: ['CATERING_CORONA_ROOM'] })).asksForDietaryNotes).toBe(true);
    expect(evaluateFormRules([], answers({ activities: ['EAT_A_LA_CARTE'] })).asksForDietaryNotes).toBe(false);
  });

  it('blocks an activity that conflicts with one already selected', () => {
    const { activityConflicts } = evaluateFormRules([
      constraint({ constraintType: 'ACTIVITY_CONFLICT', triggerActivity: 'EAT_CATERING', targetValue: 'EAT_A_LA_CARTE' }),
    ], answers());
    expect(isActivityBlocked(activityConflicts, 'EAT_CATERING', ['EAT_A_LA_CARTE'])).toBe(true);
    expect(isActivityBlocked(activityConflicts, 'EAT_CATERING', [])).toBe(false);
  });
});

describe('timeSlots', () => {
  it('runs in quarter hours past midnight and stops on the hour', () => {
    const slots = timeSlots(23, 1, true);
    expect(slots).toEqual(['23:00', '23:15', '23:30', '23:45', '00:00', '00:15', '00:30', '00:45', '01:00']);
  });
});

describe('minBookingDate', () => {
  it('is today without a rule and moves forward by the advance days', () => {
    const today = new Date('2030-03-10T15:00:00');
    expect(minBookingDate(0, today)).toBe(new Date(new Date(today).setHours(0, 0, 0, 0)).toISOString().split('T')[0]);
    const inTwoWeeks = new Date(today);
    inTwoWeeks.setHours(0, 0, 0, 0);
    inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
    expect(minBookingDate(14, today)).toBe(inTwoWeeks.toISOString().split('T')[0]);
  });
});
