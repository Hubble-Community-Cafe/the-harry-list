import { test, expect } from '@playwright/test';
import { CalendarAppointmentsPage } from '../../pages/CalendarAppointmentsPage';
import { resetBackend, seedUser } from '../../fixtures/backend';
import { attachText, captureScreenshot } from '../../fixtures/evidence';
import { BACKEND_URL } from '../../playwright.config';

/**
 * Admin can configure a generic recurring appointment — "every 2nd Friday of the
 * month" (#286) — through the guided builder, and the backend emits the correct
 * RFC 5545 RRULE (BYDAY=2FR) in the public iCal feed. This exercises the wiring
 * from the new UI through persistence to ICS generation in one journey.
 */
const FEED_TOKEN = 'e2e-feed-token';

test.describe('admin: recurring calendar appointments', () => {
  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedUser(request, { oid: 'e2e-admin', email: 'admin@e2e.test', role: 'ADMIN' });
  });

  test('creates an "every 2nd Friday" appointment and emits BYDAY=2FR in the feed', async ({ page, request }, testInfo) => {
    const appointments = new CalendarAppointmentsPage(page);
    await appointments.goto();

    await appointments.createNthWeekdayAppointment({
      title: 'Second Friday Drinks',
      date: '2030-01-11', // the 2nd Friday of January 2030
      week: 2,
      weekday: 'FRIDAY',
    });

    // Appears in the list with a descriptive recurrence summary badge.
    await expect(appointments.rows()).toHaveCount(1);
    await expect(appointments.recurrenceBadge()).toHaveText('Every 2nd Friday');
    await captureScreenshot(testInfo, page, '1-nth-weekday-created');

    // End-to-end wiring: the backend renders the right RRULE in the public iCal feed.
    const feed = await request.get(`${BACKEND_URL}/api/calendar/feed.ics?token=${FEED_TOKEN}`);
    expect(feed.status()).toBe(200);
    const ics = await feed.text();
    await attachText(testInfo, 'feed.ics', ics);
    expect(ics).toContain('Second Friday Drinks');
    expect(ics).toContain('RRULE:FREQ=MONTHLY;BYDAY=2FR');
  });
});
