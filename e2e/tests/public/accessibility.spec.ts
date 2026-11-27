import { test, expect } from '@playwright/test';
import { ReservationFormPage } from '../../pages/ReservationFormPage';
import { resetBackend, seedBlockedPeriod } from '../../fixtures/backend';
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
      await expect(page.getByText('Request received')).toBeVisible();
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

test('keyboard: Continue moves focus to the next step heading', async ({ page, request }) => {
  await resetBackend(request);
  const form = new ReservationFormPage(page);
  await form.goto();
  await form.fillContact({ name: 'Ada Access', email: 'ada.a11y@example.com' });
  await page.getByRole('button', { name: 'Continue' }).press('Enter');

  await expect(page.getByRole('heading', { name: 'Event Details' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Step 1 of 4: Contact, completed' })).toBeVisible();
});

test('keyboard: a focused choice card shows a visible focus ring', async ({ page, request }) => {
  await resetBackend(request);
  const form = new ReservationFormPage(page);
  await form.goto();
  await form.fillContact({ name: 'Ada Access', email: 'ada.a11y@example.com' });
  await form.continue();
  await form.expectStep('Event Details');

  // The radios are visually hidden; arrow keys move between them like a guest would.
  await page.getByTestId('seating-INSIDE').focus();
  await page.keyboard.press('ArrowRight');
  const outside = page.getByTestId('seating-OUTSIDE');
  await expect(outside).toBeFocused();

  const card = page.locator('label').filter({ has: outside });
  await expect(card).toHaveCSS('outline-style', 'solid');
  await expect(card).toHaveCSS('outline-width', '2px');
});

for (const [theme, edge] of [['dark', 'rgb(85, 122, 134)'], ['light', 'rgb(127, 143, 152)']] as const) {
  test(`form fields show their 3:1 edge colour (${theme})`, async ({ page, request }) => {
    // Guards a cascade-layer bug: an unlayered default border colour once overrode every
    // border class, so dark-mode fields had no visible edge.
    await resetBackend(request);
    await useTheme(page, theme);
    const form = new ReservationFormPage(page);
    await form.goto();
    await expect(page.getByTestId('contact-name')).toHaveCSS('border-top-color', edge);
  });
}

for (const [theme, title, panel] of [['dark', 'rgb(255, 255, 255)', 'rgb(10, 34, 42)'], ['light', 'rgb(26, 36, 40)', 'rgb(255, 255, 255)']] as const) {
  test(`dialog titles stand out from the dialog panel (${theme})`, async ({ page, request }) => {
    // Guards the shared .dialog-title: it once stayed white on the white light-mode panel, which
    // axe only reported as "needs review", not as a violation.
    await resetBackend(request);
    await useTheme(page, theme);
    const form = new ReservationFormPage(page);
    await form.goto();
    await form.openPrivacyFromFooter();
    await expect(form.privacyDialog()).toHaveCSS('background-color', panel);
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toHaveCSS('color', title);
  });
}

const NOTICE_TONES = {
  dark: { info: 'rgb(125, 211, 219)', warning: 'rgb(255, 188, 125)', error: 'rgb(244, 163, 163)' },
  light: { info: 'rgb(21, 94, 109)', warning: 'rgb(138, 75, 18)', error: 'rgb(161, 42, 42)' },
};

for (const theme of THEMES) {
  test(`notices use the shared housestyle tones (${theme})`, async ({ page, request }) => {
    // Info in Hubble teal, warnings in peach, errors in red: the shared notice tokens, not raw
    // Tailwind blue, amber and red.
    await resetBackend(request);
    await seedBlockedPeriod(request, { location: 'HUBBLE', startDate: '2030-12-01', endDate: '2030-12-03', reason: 'Maintenance', publicMessage: 'Closed for maintenance.', softBlock: false });
    await useTheme(page, theme);
    const form = new ReservationFormPage(page);
    await form.goto();
    await form.fillContact({ name: 'Nora Notice', email: 'nora.notice@example.com' });
    await form.continue();

    await form.setGuests(5);
    await expect(page.getByText('Reservations under 8 guests are only available at Meteor.', { exact: false })).toHaveCSS('color', NOTICE_TONES[theme].info);
    await form.selectSeating('INSIDE');
    await expect(page.getByText('Important location information:')).toHaveCSS('color', NOTICE_TONES[theme].warning);

    await form.setGuests(20);
    await form.selectLocation('HUBBLE');
    await page.getByTestId('event-date').fill('2030-12-02');
    await expect(form.blockedNotice()).toHaveCSS('color', NOTICE_TONES[theme].error);
  });
}
