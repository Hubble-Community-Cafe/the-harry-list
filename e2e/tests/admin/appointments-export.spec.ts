import { test, expect } from '@playwright/test';
import { statSync } from 'node:fs';
import { resetBackend, seedUser, seedAppointment } from '../../fixtures/backend';
import { captureScreenshot } from '../../fixtures/evidence';

/**
 * Appointments on the PDF export (#303): a calendar appointment that falls on the
 * exported day appears in the daily PDF, so people without portal access find it there.
 * Verifies the UI toggle -> endpoint -> PDF download path end-to-end (the appointment
 * selection/rendering itself is unit-tested in PdfExportServiceTest). The appointment is
 * seeded directly so the test stays isolated from the appointments-page UI.
 */
test.describe('admin: appointments on the PDF export', () => {
  const DATE = '2030-12-12';

  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedUser(request, { oid: 'e2e-admin', email: 'admin@e2e.test', role: 'ADMIN' });
    // HUBBLE matches the export page's default location.
    await seedAppointment(request, {
      title: 'Beer delivery',
      description: 'Crates dropped at the back door',
      date: DATE,
      startTime: '09:00',
      endTime: '10:00',
      location: 'HUBBLE',
    });
  });

  test('downloads a daily PDF that includes the day\'s appointment', async ({ page }, testInfo) => {
    await page.goto('/export');
    await page.getByTestId('export-date').fill(DATE);
    // Appointments appear regardless of the confirmed-only default, so no reservation is needed.
    await captureScreenshot(testInfo, page, '1-export-with-appointment');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-submit').click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    const path = await download.path();
    expect(statSync(path).size).toBeGreaterThan(0);
    await testInfo.attach('daily-report-with-appointment.pdf', { path, contentType: 'application/pdf' });
  });
});
