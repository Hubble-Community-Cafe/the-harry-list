import { expect, type Page, type TestInfo } from '@playwright/test';
import { attachJson } from './evidence';

const GOOGLE_FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

/**
 * Loads `path` and asserts the fonts are self-hosted: no request reaches Google Fonts (which would
 * share every visitor's IP address with Google), and Lato is served from the app's own origin.
 */
export async function expectSelfHostedFonts(page: Page, testInfo: TestInfo, path = '/'): Promise<void> {
  const requested: string[] = [];
  page.on('request', (req) => requested.push(req.url()));

  const latoResponse = page.waitForResponse((res) => /\/lato-400[^/]*\.woff2$/.test(new URL(res.url()).pathname));
  await page.goto(path);
  const lato = await latoResponse;
  await page.evaluate(() => document.fonts.ready);

  const googleRequests = requested.filter((url) => GOOGLE_FONT_HOSTS.includes(new URL(url).hostname));
  const fontRequests = requested.filter((url) => /\.(woff2?|ttf)(\?|$)/.test(url));
  await attachJson(testInfo, 'font-requests.json', { fontRequests, googleRequests });

  expect(googleRequests, 'requests to Google Fonts').toEqual([]);
  expect(lato.status()).toBe(200);
  expect(new URL(lato.url()).origin).toBe(new URL(page.url()).origin);
}
