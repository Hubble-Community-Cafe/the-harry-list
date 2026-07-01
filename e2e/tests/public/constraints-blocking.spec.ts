import { test, expect } from '@playwright/test';
import { ReservationFormPage } from '../../pages/ReservationFormPage';
import { resetBackend, seedConstraint } from '../../fixtures/backend';
import { captureScreenshot } from '../../fixtures/evidence';

/**
 * Proves form constraints are still wired end-to-end (public form -> backend). The full
 * permutation matrix lives in ConstraintValidationServiceTest; here we assert one
 * representative constraint actually blocks a submission with its configured message.
 */
test.describe('public: form constraints are enforced', () => {
  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedConstraint(request, {
      constraintType: 'GUEST_LIMIT',
      triggerActivity: 'EAT_A_LA_CARTE',
      numericValue: 15,
      message: 'A la carte dining is limited to 15 guests.',
    });
  });

  test('a guest-limit constraint blocks advancing and shows its message', async ({ page }, testInfo) => {
    const form = new ReservationFormPage(page);
    await form.goto();

    await form.fillContact({ name: 'Jane Smith', email: 'jane@example.com' });
    await form.continue();
    await form.expectStep('Event Details');

    await form.fillActivity({ title: 'Big dinner', date: '2030-09-10', guests: 20 });
    await form.toggleActivity('Eat a la carte');

    // The constraint message is shown...
    await expect(page.getByText('A la carte dining is limited to 15 guests.')).toBeVisible();
    await captureScreenshot(testInfo, page, '1-constraint-warning');

    // ...and the form refuses to advance.
    await form.continue();
    await form.expectStep('Event Details');
  });
});
