import { test, expect } from '@playwright/test';
import { ReservationFormPage } from '../../pages/ReservationFormPage';
import { captureScreenshot } from '../../fixtures/evidence';

/**
 * Guests must be able to read how their data is handled before submitting personal details
 * (GDPR). The privacy policy is reachable from the footer and opens in a dialog without
 * leaving the form.
 */
test.describe('public: privacy policy', () => {
  test('opens from the footer and closes again', async ({ page }, testInfo) => {
    const form = new ReservationFormPage(page);
    await form.goto();

    // Not shown until requested.
    await expect(form.privacyDialog()).toHaveCount(0);

    await form.openPrivacyFromFooter();
    await expect(form.privacyDialog()).toBeVisible();
    await expect(form.privacyDialog()).toContainText('Privacy Policy');
    await captureScreenshot(testInfo, page, '1-privacy-open');

    await form.closePrivacy();
    await expect(form.privacyDialog()).toHaveCount(0);
  });
});
