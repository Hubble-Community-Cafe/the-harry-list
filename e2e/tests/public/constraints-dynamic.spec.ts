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
    await form.expectStep('Activity Details');

    const alaCarte = page.getByRole('checkbox', { name: 'Eat a la carte' });
    await expect(alaCarte).toBeEnabled();

    await form.toggleActivity('Eat catering');

    await expect(alaCarte).toBeDisabled();
    await captureScreenshot(testInfo, page, '1-conflicting-activity-disabled');
  });
});
