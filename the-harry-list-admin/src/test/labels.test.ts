import { describe, it, expect } from 'vitest';
import {
  humanize, statusLabel, locationLabel, paymentLabel, invoiceTypeLabel, seatingLabel, activityLabel, roleLabel,
} from '../lib/labels';

describe('labels', () => {
  it('names the stored codes in words staff use', () => {
    expect(statusLabel('PENDING')).toBe('Pending');
    expect(locationLabel('HUBBLE')).toBe('Hubble');
    expect(paymentLabel('ONE_PERSON')).toBe('One person pays at the end');
    expect(invoiceTypeLabel('TUE')).toBe('TU/e');
    expect(seatingLabel('OUTSIDE')).toBe('Outside');
    expect(activityLabel('EAT_A_LA_CARTE')).toBe('Eat a la Carte');
    expect(roleLabel('ADMIN')).toBe('Admin');
  });

  it('treats an empty location as no preference', () => {
    expect(locationLabel('')).toBe('No preference');
    expect(locationLabel(null)).toBe('No preference');
    expect(locationLabel('NO_PREFERENCE')).toBe('No preference');
  });

  it('never shows a raw code: unknown codes become words, empty stays empty', () => {
    expect(humanize('STATUS_CHANGE')).toBe('Status change');
    expect(statusLabel('ON_HOLD')).toBe('On hold');
    expect(paymentLabel(undefined)).toBe('');
  });
});

describe('constraintValueLabel', () => {
  it('names locations, seating, activities and the confirm marker, and keeps free text', async () => {
    const { constraintValueLabel } = await import('../lib/labels');
    expect(constraintValueLabel('METEOR')).toBe('Meteor');
    expect(constraintValueLabel('INSIDE')).toBe('Inside');
    expect(constraintValueLabel('EAT_CATERING')).toBe('Eat Catering');
    expect(constraintValueLabel('CONFIRM')).toBe('asks to confirm');
    expect(constraintValueLabel('18:00-22:00')).toBe('18:00-22:00');
  });
});

describe('change history labels', () => {
  it('names fields and their values in words, and says when a value was empty', async () => {
    const { fieldLabel, changeValueLabel } = await import('../lib/labels');
    expect(fieldLabel('paymentOption')).toBe('Payment option');
    expect(fieldLabel('status')).toBe('Status');
    expect(changeValueLabel('status', 'CONFIRMED')).toBe('Confirmed');
    expect(changeValueLabel('specialActivities', 'EAT_CATERING, GRADUATION')).toBe('Eat Catering, Graduation / PhD Defense');
    expect(changeValueLabel('eventTitle', 'Board game night')).toBe('Board game night');
    expect(changeValueLabel('phoneNumber', null)).toBe('(empty)');
  });
});
