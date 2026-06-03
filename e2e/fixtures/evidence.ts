import type { Page, TestInfo } from '@playwright/test';

/**
 * Helpers for attaching curated, human-readable evidence to the HTML report — so a
 * passing run shows positive proof of each flow (not just a green check), and a failing
 * run has the exact UI/email/DB state at the point of interest.
 */

/** Attach a full-page screenshot under a descriptive step name. */
export async function captureScreenshot(testInfo: TestInfo, page: Page, name: string): Promise<void> {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}

/** Attach rendered email HTML (e.g. from Mailpit) so the report shows what was sent. */
export async function attachHtml(testInfo: TestInfo, name: string, html: string): Promise<void> {
  await testInfo.attach(name, { body: html, contentType: 'text/html' });
}

/** Attach an object as pretty JSON (e.g. a DB/API snapshot). */
export async function attachJson(testInfo: TestInfo, name: string, value: unknown): Promise<void> {
  await testInfo.attach(name, {
    body: JSON.stringify(value, null, 2),
    contentType: 'application/json',
  });
}
