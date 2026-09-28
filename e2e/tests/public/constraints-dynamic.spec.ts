import { test, expect } from '@playwright/test';
import { ReservationFormPage } from '../../pages/ReservationFormPage';
import { resetBackend, seedConstraint } from '../../fixtures/backend';
import { captureScreenshot } from '../../fixtures/evidence';

/**
 * Dynamic constraint behaviour on the form: an ACTIVITY_CONFLICT makes the conflicting
 * activity un-selectable once its counterpart is chosen. Representative of the form
 * reacting live to configured constraints (full matrix is unit-tested server-side).
 */
test.describe('public: activity-conflict constraint disables the conflicting option', () => {
  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    // Activity conflicts are directional and seeded both ways in production, so the
    // form can disable whichever side the guest hasn't picked yet.
    await seedConstraint(request, {
      constraintType: 'ACTIVITY_CONFLICT',
      triggerActivity: 'EAT_CATERING',
      targetValue: 'EAT_A_LA_CARTE',
      message: 'Catering and à la carte cannot be combined.',
    });
    await seedConstraint(request, {
      constraintType: 'ACTIVITY_CONFLICT',
      triggerActivity: 'EAT_A_LA_CARTE',
      targetValue: 'EAT_CATERING',
      message: 'Catering and à la carte cannot be combined.',
    });
  });

  test('selecting catering disables the à la carte option', async ({ page }, testInfo) => {
    const form = new ReservationFormPage(page);
    await form.goto();
    await form.fillContact({ name: 'Jane Smith', email: 'jane@example.com' });
    await form.continue();
    await form.expectStep('Event Details');

    const alaCarte = page.getByRole('checkbox', { name: 'Eat a la carte' });
    await expect(alaCarte).toBeEnabled();

    await form.toggleActivity('Eat catering');

    await expect(alaCarte).toBeDisabled();
    await captureScreenshot(testInfo, page, '1-conflicting-activity-disabled');
  });
});

/**
 * Fewer than 8 guests forces Meteor. Typing "12" passes through 1 guest, so the form briefly
 * locks to Meteor; once the count is 8 or more it must give the guest's own choice back
 * instead of silently leaving the booking at Meteor.
 */
test.describe('public: the small-group Meteor lock gives the chosen location back', () => {
  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
  });

  test('a Hubble booking stays at Hubble after typing a bigger group', async ({ page }, testInfo) => {
    const form = new ReservationFormPage(page);
    await form.goto();
    await form.fillContact({ name: 'Hugo Hubble', email: 'hugo.hubble@example.com' });
    await form.continue();
    await form.expectStep('Event Details');

    await form.selectLocation('HUBBLE');

    // A small group really is Meteor only.
    await form.typeGuests(5);
    await expect(form.locationRadio('METEOR')).toBeChecked();
    await expect(form.locationRadio('HUBBLE')).toBeDisabled();

    await form.typeGuests(12);
    await expect(form.locationRadio('HUBBLE')).toBeChecked();
    await expect(form.locationRadio('HUBBLE')).toBeEnabled();
    await captureScreenshot(testInfo, page, '1-hubble-kept-after-typing-12');
  });
});

/**
 * A SEATING_LOCK forces inside or outside while its activity is selected. Removing the
 * activity must give the guest's own seating choice back.
 */
test.describe('public: a seating lock gives the chosen seating back', () => {
  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedConstraint(request, {
      constraintType: 'SEATING_LOCK',
      triggerActivity: 'CATERING_CORONA_ROOM',
      targetValue: 'INSIDE',
      message: 'Corona Room catering requires inside seating.',
    });
  });

  test('outside seating comes back after deselecting the activity', async ({ page }, testInfo) => {
    const form = new ReservationFormPage(page);
    await form.goto();
    await form.fillContact({ name: 'Otto Outside', email: 'otto.outside@example.com' });
    await form.continue();
    await form.expectStep('Event Details');

    await form.selectSeating('OUTSIDE');

    await form.toggleActivity('Catering Corona Room');
    await expect(form.seatingRadio('INSIDE')).toBeChecked();
    await expect(form.seatingRadio('OUTSIDE')).toBeDisabled();

    await form.toggleActivity('Catering Corona Room');
    await expect(form.seatingRadio('OUTSIDE')).toBeChecked();
    await expect(form.seatingRadio('OUTSIDE')).toBeEnabled();
    await captureScreenshot(testInfo, page, '1-outside-kept-after-deselecting');
  });
});
