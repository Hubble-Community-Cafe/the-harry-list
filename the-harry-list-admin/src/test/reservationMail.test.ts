import { describe, it, expect } from 'vitest';
import {
  MAIL_TYPES,
  MAIL_TYPE_VALUES,
  availableMailTypes,
} from '../lib/reservationMail';

/**
 * Mirrors ReservationMailType in the backend. If the two drift, the admin offers a mail the API
 * rejects with 400 (or hides one that would send), so the shape is pinned rather than
 * spot-checked.
 */
describe('reservation mail types', () => {
  it('matches the backend mail types and their triggering activities', () => {
    expect(MAIL_TYPE_VALUES).toEqual(['CATERING', 'COBO']);
    expect(MAIL_TYPES.CATERING.activities)
      .toEqual(['EAT_A_LA_CARTE', 'EAT_CATERING', 'CATERING_CORONA_ROOM']);
    expect(MAIL_TYPES.COBO.activities).toEqual(['COBO']);
  });

  it('keeps CoBo out of the catering activities and vice versa', () => {
    expect(MAIL_TYPES.CATERING.activities).not.toContain('COBO');
    for (const activity of MAIL_TYPES.COBO.activities) {
      expect(MAIL_TYPES.CATERING.activities).not.toContain(activity);
    }
  });

  it('pre-ticks attachments for catering but not for CoBo', () => {
    expect(MAIL_TYPES.CATERING.preselectAllAttachments).toBe(true);
    expect(MAIL_TYPES.COBO.preselectAllAttachments).toBe(false);
  });

  it('gives every mail type a label', () => {
    for (const type of MAIL_TYPE_VALUES) {
      expect(MAIL_TYPES[type].label).toBeTruthy();
    }
  });
});

describe('availableMailTypes', () => {
  it('offers nothing when the reservation has no activities', () => {
    expect(availableMailTypes({ status: 'PENDING', specialActivities: [] })).toEqual([]);
    expect(availableMailTypes({ status: 'PENDING' })).toEqual([]);
  });

  it('offers catering for each catering activity', () => {
    for (const activity of ['EAT_A_LA_CARTE', 'EAT_CATERING', 'CATERING_CORONA_ROOM']) {
      expect(availableMailTypes({ status: 'PENDING', specialActivities: [activity] }))
        .toEqual(['CATERING']);
    }
  });

  it('offers CoBo only for a CoBo reservation', () => {
    expect(availableMailTypes({ status: 'PENDING', specialActivities: ['COBO'] }))
      .toEqual(['COBO']);
  });

  it('offers both when the reservation is catering and CoBo', () => {
    expect(availableMailTypes({ status: 'CONFIRMED', specialActivities: ['EAT_CATERING', 'COBO'] }))
      .toEqual(['CATERING', 'COBO']);
  });

  it('offers nothing for a rejected reservation, whatever its activities', () => {
    expect(availableMailTypes({ status: 'REJECTED', specialActivities: ['EAT_CATERING', 'COBO'] }))
      .toEqual([]);
  });

  it('still offers mail for every other status', () => {
    for (const status of ['PENDING', 'IN_PROGRESS', 'CONFIRMED', 'CANCELLED', 'COMPLETED']) {
      expect(availableMailTypes({ status, specialActivities: ['COBO'] })).toEqual(['COBO']);
    }
  });

  it('offers nothing for a missing reservation', () => {
    expect(availableMailTypes(null)).toEqual([]);
    expect(availableMailTypes(undefined)).toEqual([]);
  });

  it('ignores activities it does not know', () => {
    expect(availableMailTypes({ status: 'PENDING', specialActivities: ['GRADUATION'] }))
      .toEqual([]);
  });
});
