import { describe, it, expect } from 'vitest';
import { noticeApplies, noticeConditionsMet, requiresConfirmation } from './activityNotices';
import type { FormConstraint } from '../types/reservation';

const notice = (overrides: Partial<FormConstraint> = {}): FormConstraint => ({
  id: 1,
  constraintType: 'ACTIVITY_NOTICE',
  triggerActivity: 'EAT_A_LA_CARTE',
  message: 'Please pre-order.',
  enabled: true,
  ...overrides,
});

describe('noticeConditionsMet', () => {
  it('always holds for a notice without location or guest conditions', () => {
    expect(noticeConditionsMet(notice(), { activities: [] })).toBe(true);
  });

  it('holds only at the configured location', () => {
    const c = notice({ secondaryValue: 'METEOR' });
    expect(noticeConditionsMet(c, { activities: [], location: 'METEOR' })).toBe(true);
    expect(noticeConditionsMet(c, { activities: [], location: 'HUBBLE' })).toBe(false);
    expect(noticeConditionsMet(c, { activities: [], location: 'NO_PREFERENCE' })).toBe(false);
    expect(noticeConditionsMet(c, { activities: [], location: null })).toBe(false);
  });

  it('holds from the minimum number of guests upwards', () => {
    const c = notice({ numericValue: 8 });
    expect(noticeConditionsMet(c, { activities: [], guests: 7 })).toBe(false);
    expect(noticeConditionsMet(c, { activities: [], guests: 8 })).toBe(true);
    expect(noticeConditionsMet(c, { activities: [], guests: 20 })).toBe(true);
    expect(noticeConditionsMet(c, { activities: [], guests: Number.NaN })).toBe(false);
    expect(noticeConditionsMet(c, { activities: [] })).toBe(false);
  });

  it('treats null values from the API as "no condition"', () => {
    const c = notice({ numericValue: null as unknown as undefined, secondaryValue: null as unknown as undefined });
    expect(noticeConditionsMet(c, { activities: [], location: 'HUBBLE', guests: 1 })).toBe(true);
  });
});

describe('noticeApplies', () => {
  const c = notice({ secondaryValue: 'METEOR', numericValue: 8 });

  it('applies when activity, location and group size all match', () => {
    expect(noticeApplies(c, { activities: ['EAT_A_LA_CARTE'], location: 'METEOR', guests: 8 })).toBe(true);
  });

  it('does not apply when any part is missing', () => {
    expect(noticeApplies(c, { activities: [], location: 'METEOR', guests: 8 })).toBe(false);
    expect(noticeApplies(c, { activities: ['EAT_A_LA_CARTE'], location: 'HUBBLE', guests: 8 })).toBe(false);
    expect(noticeApplies(c, { activities: ['EAT_A_LA_CARTE'], location: 'METEOR', guests: 7 })).toBe(false);
  });

  it('ignores other constraint types', () => {
    const lock = notice({ constraintType: 'LOCATION_LOCK', secondaryValue: undefined, numericValue: undefined });
    expect(noticeApplies(lock, { activities: ['EAT_A_LA_CARTE'] })).toBe(false);
  });
});

describe('requiresConfirmation', () => {
  it('is true only for notices marked CONFIRM', () => {
    expect(requiresConfirmation(notice({ targetValue: 'CONFIRM' }))).toBe(true);
    expect(requiresConfirmation(notice())).toBe(false);
  });
});
