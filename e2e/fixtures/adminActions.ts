import type { Page } from '@playwright/test';

/**
 * Shared helpers for driving the admin reservation detail page.
 *
 * Both the status change and the templated mails sit behind a dropdown, so every spec would
 * otherwise repeat the same open-menu-then-pick-item dance.
 */

/**
 * Move a reservation to another status via the "Change Status" menu, then confirm it.
 *
 * @param page   the admin page, already on a reservation detail view
 * @param target the status to move to, e.g. 'CONFIRMED'
 */
export async function changeStatus(page: Page, target: string): Promise<void> {
  await page.getByTestId('change-status').click();
  await page.getByTestId(`status-option-${target}`).click();
  await page.getByTestId('status-dialog-submit').click();
}

/**
 * Open the mail dialog for a templated mail via the "Send Mail" menu. Stops at the dialog so
 * the caller can inspect or adjust the subject, body and attachments before sending.
 *
 * @param mailType 'CATERING' or 'COBO'
 */
export async function openMailDialog(page: Page, mailType: 'CATERING' | 'COBO'): Promise<void> {
  await page.getByTestId('send-mail').click();
  await page.getByTestId(`mail-option-${mailType}`).click();
}
