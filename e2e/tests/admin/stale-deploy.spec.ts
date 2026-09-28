import { test, expect } from '@playwright/test';
import { resetBackend, seedUser } from '../../fixtures/backend';

/**
 * Pages load on demand from content-hashed chunk files. A tab opened before a deploy asks for the
 * previous build's files, which no longer exist. The admin then reloads once to fetch the new build
 * (chunkReload.ts); if the chunk is still missing right after that reload, it shows the error
 * screen instead of reloading in a loop. The missing file is simulated by answering 404.
 */
const RESERVATIONS_CHUNK = /\/assets\/ReservationsPage-[^/]+\.js$/;

test.describe('admin: page chunks from a previous deploy', () => {
  test.beforeEach(async ({ page, request }) => {
    await resetBackend(request);
    await seedUser(request, { oid: 'e2e-admin', role: 'ADMIN' });
    await page.goto('/');
    await page.locator('main h1').first().waitFor();
  });

  test('a missing page chunk reloads the app once, then the page opens', async ({ page }) => {
    let requests = 0;
    await page.route(RESERVATIONS_CHUNK, (route) =>
      requests++ === 0 ? route.fulfill({ status: 404, body: 'Not Found' }) : route.continue(),
    );
    let loads = 0;
    page.on('load', () => loads++);

    await page.getByRole('link', { name: 'Reservations' }).click();

    await expect(page.getByRole('heading', { name: 'Reservations', level: 1 })).toBeVisible();
    expect(loads).toBe(1);
    await expect(page).toHaveURL(/\/reservations$/);
  });

  test('a chunk that stays missing shows the error screen instead of reloading in a loop', async ({ page }) => {
    await page.route(RESERVATIONS_CHUNK, (route) => route.fulfill({ status: 404, body: 'Not Found' }));
    let loads = 0;
    page.on('load', () => loads++);

    await page.getByRole('link', { name: 'Reservations' }).click();

    await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    // Give a reload loop time to show itself: there must be exactly the one reload.
    await page.waitForTimeout(2_000);
    expect(loads).toBe(1);
  });
});
