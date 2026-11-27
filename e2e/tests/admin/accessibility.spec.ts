import { test, expect } from '@playwright/test';
import { resetBackend, seedReservation, seedAdmin } from '../../fixtures/backend';
import { THEMES, useTheme, expectNoA11yViolations } from '../../fixtures/a11y';

/** WCAG 2.2 AA (axe) on every admin page, in both themes, as an ADMIN so every page shows its full content. */
for (const theme of THEMES) {
  test(`every admin page is accessible (${theme})`, async ({ page, request }, testInfo) => {
    test.setTimeout(90_000);
    await resetBackend(request);
    await seedAdmin(request);
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
  await seedAdmin(request);
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

/** The edit dialogs: axe never saw them before, since no page scan opened one. */
for (const theme of THEMES) {
  test(`admin edit dialogs are accessible (${theme})`, async ({ page, request }, testInfo) => {
    test.setTimeout(90_000);
    await resetBackend(request);
    await seedAdmin(request);
    const seeded = await seedReservation(request, {
      contactName: 'Ada Access', email: 'ada.a11y@example.com', eventTitle: 'Dialog Booking',
      description: 'Dialogs under axe', eventDate: '2030-10-09', startTime: '15:00', endTime: '17:00',
      expectedGuests: 8, location: 'HUBBLE', seatingArea: 'INSIDE', paymentOption: 'INDIVIDUAL', status: 'PENDING',
    });
    await useTheme(page, theme);

    await page.goto(`/reservations/${seeded.id}`);
    await page.getByTestId('edit-reservation').click();
    await expect(page.getByRole('dialog', { name: 'Edit reservation' })).toBeVisible();
    await expectNoA11yViolations(page, testInfo, `${theme} edit reservation dialog`);
    await page.keyboard.press('Escape');

    await page.goto('/calendar-appointments');
    await page.getByRole('button', { name: 'Add appointment' }).click();
    await expect(page.getByRole('dialog', { name: 'New appointment' })).toBeVisible();
    await expectNoA11yViolations(page, testInfo, `${theme} appointment dialog`);
    await page.keyboard.press('Escape');

    await page.goto('/settings');
    await page.getByRole('button', { name: 'Add constraint' }).click();
    await expect(page.getByRole('dialog', { name: 'New constraint' })).toBeVisible();
    await expectNoA11yViolations(page, testInfo, `${theme} constraint dialog`);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /Blocked periods/ }).click();
    await page.getByRole('button', { name: 'Add blocked period' }).click();
    await expect(page.getByRole('dialog', { name: 'New blocked period' })).toBeVisible();
    await expectNoA11yViolations(page, testInfo, `${theme} blocked period dialog`);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /Help/ }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectNoA11yViolations(page, testInfo, `${theme} help dialog`);
  });
}

/** Phone width: the layout switches to a header with a menu button and a slide-in drawer. */
for (const theme of THEMES) {
  test(`admin at phone width is accessible (${theme})`, async ({ page, request }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await resetBackend(request);
    await seedAdmin(request);
    await useTheme(page, theme);

    for (const route of ['/', '/reservations', '/week-overview', '/settings']) {
      await page.goto(route);
      await page.locator('main h1').first().waitFor();
      await page.waitForTimeout(750);
      await expectNoA11yViolations(page, testInfo, `${theme} phone ${route}`);
    }
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeFocused();
    await expectNoA11yViolations(page, testInfo, `${theme} phone open menu`);
  });
}

test('keyboard at phone width: the closed menu is out of the tab order, Escape closes it', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await resetBackend(request);
  await seedAdmin(request);
  await page.goto('/');
  await page.locator('main h1').first().waitFor();

  const menu = page.getByRole('button', { name: 'Open menu' });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  // Tab through the start of the page: focus never lands in the hidden drawer.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('#admin-sidebar'))).toBe(false);
  }

  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
  await expect(page).toHaveTitle('Dashboard · The Harry List Admin');
});

test('keyboard: a dialog keeps focus inside, closes on Escape and returns focus to its opener', async ({ page, request }) => {
  await resetBackend(request);
  await seedAdmin(request);
  const seeded = await seedReservation(request, {
    contactName: 'Kai Keys', email: 'kai.keys@example.com', eventTitle: 'Keyboard Booking', description: 'Dialog keyboard test',
    eventDate: '2030-10-10', startTime: '15:00', endTime: '17:00', expectedGuests: 8,
    location: 'HUBBLE', seatingArea: 'INSIDE', paymentOption: 'INDIVIDUAL', status: 'PENDING',
  });
  await page.goto(`/reservations/${seeded.id}`);

  const opener = page.getByTestId('edit-reservation');
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Edit reservation' });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);

  // Tab through more stops than the dialog has: focus must never leave it.
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});
