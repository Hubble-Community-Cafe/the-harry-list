import { test, expect } from '@playwright/test';
import { resetBackend, seedAdmin } from '../../fixtures/backend';
import { expectSelfHostedFonts } from '../../fixtures/fonts';

test('admin serves Lato itself and never contacts Google Fonts', async ({ page }, testInfo) => {
  await expectSelfHostedFonts(page, testInfo);
});

test('page subtitles use Lato Light, and the small sidebar label stays regular', async ({ page, request }) => {
  await resetBackend(request);
  await seedAdmin(request);
  await page.goto('/settings');
  await page.locator('main h1').first().waitFor();

  // font-light must set the weight (it once set a font family, so Lato Light was never used).
  const subtitle = page.getByText('Manage constraints, blocked periods, and admin settings');
  await expect(subtitle).toHaveCSS('font-weight', '300');
  await expect(page.getByText('Admin Portal')).toHaveCSS('font-weight', '400');
  expect(await page.evaluate(() => document.fonts.check('300 16px Lato'))).toBe(true);
});
