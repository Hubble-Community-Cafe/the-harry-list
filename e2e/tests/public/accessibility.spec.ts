import { test, expect } from '@playwright/test';
import { ReservationFormPage } from '../../pages/ReservationFormPage';
import { resetBackend } from '../../fixtures/backend';
import { THEMES, useTheme, expectNoA11yViolations } from '../../fixtures/a11y';

/**
 * WCAG 2.2 AA (axe) on every step and state of the public form, in both themes: each form step,
 * the validation errors, the confirmation screen and the privacy dialog.
 */
for (const theme of THEMES) {
  test.describe(`public form accessibility (${theme})`, () => {
    test.beforeEach(async ({ page, request }) => {
      await resetBackend(request);
      await useTheme(page, theme);
    });

    test('every step, the confirmation and the privacy dialog', async ({ page }, testInfo) => {
      const form = new ReservationFormPage(page);
      await form.goto();
      await expectNoA11yViolations(page, testInfo, `${theme} 1 contact`);

      await form.fillContact({ name: 'Ada Access', email: 'ada.a11y@example.com' });
      await form.continue();
      await form.expectStep('Event Details');
      await expectNoA11yViolations(page, testInfo, `${theme} 2 details`);

      await form.fillActivity({ title: 'Accessible Drinks', date: '2030-10-08', startTime: '15:00', endTime: '17:00', guests: 12 });
      await form.selectLocation('NO_PREFERENCE');
      await form.selectSeating('INSIDE');
      await expectNoA11yViolations(page, testInfo, `${theme} 2 details filled`);
      await form.continue();

      await form.expectStep('Payment Information');
      await form.selectPayment('People pay individually');
      await expectNoA11yViolations(page, testInfo, `${theme} 3 payment`);
      await form.continue();

      await form.acceptTerms();
      await expectNoA11yViolations(page, testInfo, `${theme} 4 confirm`);
      await form.submit();
      await expect(page.getByText('Reservation Submitted!')).toBeVisible();
      await expectNoA11yViolations(page, testInfo, `${theme} 5 confirmation`);

      await form.openPrivacyFromFooter();
      await expectNoA11yViolations(page, testInfo, `${theme} privacy dialog`);
    });

    test('validation errors', async ({ page }, testInfo) => {
      const form = new ReservationFormPage(page);
      await form.goto();
      await form.continue();
      await expect(page.locator('#contactName-error')).toBeVisible();
      await expectNoA11yViolations(page, testInfo, `${theme} 1 contact errors`);
    });
  });
}

test('keyboard: the first Tab reaches a visible skip link that jumps past the header', async ({ page, request }) => {
  await resetBackend(request);
  await page.goto('/');

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeInViewport();

  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  // The next Tab continues inside the content, not in the header.
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('#main-content'))).toBe(true);
});
