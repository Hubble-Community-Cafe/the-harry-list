import { test, expect } from '@playwright/test';
import { resetBackend, seedReservation, seedUser } from '../../fixtures/backend';
import { THEMES, useTheme, expectNoA11yViolations } from '../../fixtures/a11y';

/** WCAG 2.2 AA (axe) on every admin page, in both themes, as an ADMIN so every page shows its full content. */
for (const theme of THEMES) {
  test(`every admin page is accessible (${theme})`, async ({ page, request }, testInfo) => {
    test.setTimeout(90_000);
    await resetBackend(request);
    await seedUser(request, { oid: 'e2e-admin', role: 'ADMIN' });
    const seeded = await seedReservation(request, {
      contactName: 'Ada Access',
      email: 'ada.a11y@example.com',
      eventTitle: 'Accessible Booking',
      description: 'Detail page under axe',
      eventDate: '2030-10-09',
      startTime: '15:00',
      endTime: '17:00',
      expectedGuests: 8,
      location: 'HUBBLE',
      seatingArea: 'INSIDE',
      paymentOption: 'INDIVIDUAL',
      status: 'PENDING',
    });
    await useTheme(page, theme);

    const routes = ['/', '/reservations', `/reservations/${seeded.id}`, '/week-overview', '/export', '/calendar',
      '/email-templates', '/settings', '/calendar-appointments', '/audit'];
    for (const route of routes) {
      await page.goto(route);
      await page.locator('main h1').first().waitFor();
      // Let the page's data load and render before scanning.
      await page.waitForTimeout(750);
      await expectNoA11yViolations(page, testInfo, `${theme} ${route}`);
    }
  });
}

test('keyboard: skip link to the content, and focus follows sidebar navigation', async ({ page, request }) => {
  await resetBackend(request);
  await seedUser(request, { oid: 'e2e-admin', role: 'ADMIN' });
  await page.goto('/');
  await page.locator('main h1').first().waitFor();

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();

  // Choosing another page moves focus to its content, so screen readers announce the new page.
  await page.getByRole('link', { name: 'Reservations' }).click();
  await page.locator('main h1').first().waitFor();
  await expect(page.locator('#main-content')).toBeFocused();
});
