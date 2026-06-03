import { test, expect } from '@playwright/test';
import { statSync } from 'node:fs';
import { resetBackend, seedUser, seedReservation } from '../../fixtures/backend';
import { captureScreenshot } from '../../fixtures/evidence';

/**
 * Catering-only export (#280): the export page can produce a catering-only daily PDF.
 * Verifies the UI toggle -> endpoint -> PDF download path end-to-end (the filtering logic
 * itself is unit-tested in PdfExportServiceTest). A catering reservation is seeded so the
 * report has content.
 */
test.describe('admin: catering-only PDF export', () => {
  const DATE = '2030-12-12';

  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedUser(request, { oid: 'e2e-admin', role: 'ADMIN' });
    await seedReservation(request, {
      contactName: 'Catering Guest',
      email: 'catering@example.com',
      eventTitle: 'Catered lunch',
      description: 'Food',
      eventDate: DATE,
      startTime: '12:00',
      endTime: '14:00',
      expectedGuests: 30,
      location: 'HUBBLE',
      seatingArea: 'INSIDE',
      paymentOption: 'INVOICE',
      status: 'CONFIRMED',
      specialActivities: ['EAT_CATERING'],
    });
  });

  test('downloads a catering-only PDF for the day', async ({ page }, testInfo) => {
    await page.goto('/export');
    await page.getByTestId('export-date').fill(DATE);
    // Location defaults to HUBBLE, matching the seeded reservation.
    await page.getByTestId('export-catering-only').check();
    await captureScreenshot(testInfo, page, '1-export-options');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-submit').click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    const path = await download.path();
    expect(statSync(path).size).toBeGreaterThan(0);
    await testInfo.attach('catering-daily-report.pdf', { path, contentType: 'application/pdf' });
  });
});
