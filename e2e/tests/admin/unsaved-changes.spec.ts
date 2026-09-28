import { test, expect, type Page } from '@playwright/test';
import { resetBackend, seedUser, seedReservation } from '../../fixtures/backend';

/**
 * Unsaved input in the admin is not lost by accident: leaving the page via the sidebar or the
 * browser's back button asks first, and closing the tab triggers the browser's own warning.
 * Covered on the email templates page (inline editor) and the reservation editor (a dialog).
 * (useUnsavedChanges; the admin runs a data router so the back button can be intercepted.)
 */
test.describe('admin: unsaved changes', () => {
  test.beforeEach(async ({ page, request }) => {
    await resetBackend(request);
    await seedUser(request, { oid: 'e2e-admin', role: 'ADMIN' });
    await seedReservation(request, {
      contactName: 'Unsaved Guest',
      email: 'unsaved.guest@example.com',
      eventTitle: 'Unsaved Changes Booking',
      description: 'Edited but not saved',
      eventDate: '2030-11-14',
      startTime: '15:00',
      endTime: '17:00',
      expectedGuests: 10,
      location: 'HUBBLE',
      seatingArea: 'INSIDE',
      paymentOption: 'INDIVIDUAL',
      status: 'PENDING',
    });
  });

  /** Opens the reservation from the list, starts editing and changes the guest count. */
  async function editWithoutSaving(page: Page) {
    await page.goto('/reservations');
    await page.getByPlaceholder(/Search by name/).fill('Unsaved Changes Booking');
    await page.getByTestId('reservation-row').filter({ hasText: 'Unsaved Changes Booking' }).click();
    await page.getByTestId('edit-reservation').click();
    await page.getByTestId('edit-guests').fill('42');
  }

  const discardQuestion = (page: Page) => page.getByText('Discard unsaved changes?');

  test('leaving via the sidebar asks first, and "Keep editing" keeps the change', async ({ page }) => {
    // The email template editor sits in the page itself, so the sidebar stays clickable (the
    // reservation editor is a dialog whose overlay covers the sidebar).
    await page.goto('/email-templates');
    await page.getByRole('button', { name: /Submission Confirmation/ }).click();
    const subject = page.getByPlaceholder('Subject...');
    await subject.fill('Unsaved subject');

    await page.getByRole('link', { name: 'Week Overview' }).click();
    await expect(discardQuestion(page)).toBeVisible();
    await page.getByRole('button', { name: 'Keep editing' }).click();

    await expect(discardQuestion(page)).toBeHidden();
    await expect(subject).toHaveValue('Unsaved subject');
    await expect(page).toHaveURL(/\/email-templates$/);
  });

  test('the browser back button asks too, and "Discard changes" then leaves', async ({ page }) => {
    await editWithoutSaving(page);

    await page.goBack();
    await expect(discardQuestion(page)).toBeVisible();
    await expect(page).toHaveURL(/\/reservations\/\d+$/);

    await page.getByRole('button', { name: 'Discard changes' }).click();
    await expect(page).toHaveURL(/\/reservations$/);
  });

  test('closing the tab with unsaved changes triggers the browser warning', async ({ page }) => {
    await editWithoutSaving(page);

    const dialog = new Promise<string>((resolve) =>
      page.once('dialog', async (d) => {
        resolve(d.type());
        await d.dismiss();
      }),
    );
    await page.close({ runBeforeUnload: true });
    expect(await dialog).toBe('beforeunload');
  });
});
