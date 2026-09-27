import { test } from '@playwright/test';
import { expectSelfHostedFonts } from '../../fixtures/fonts';

test('public form serves Lato itself and never contacts Google Fonts', async ({ page }, testInfo) => {
  await expectSelfHostedFonts(page, testInfo);
});
