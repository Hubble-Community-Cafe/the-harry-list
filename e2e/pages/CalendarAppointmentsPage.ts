import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page object for the admin Calendar Appointments page (custom calendar entries
 * that appear in the ICS feeds). Centralizes selectors for the guided recurrence
 * builder so feature changes touch this file, not every spec.
 */
export class CalendarAppointmentsPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/calendar-appointments');
    // Heading specifically — the text also appears in the nav.
    await expect(this.page.getByRole('heading', { name: 'Calendar Appointments' })).toBeVisible();
  }

  rows(): Locator {
    return this.page.getByTestId('appointment-row');
  }

  recurrenceBadge(): Locator {
    return this.page.getByTestId('appointment-recurrence');
  }

  /**
   * Create an all-day appointment that recurs on the Nth weekday of the month
   * (e.g. "every 2nd Friday") through the guided builder.
   */
  async createNthWeekdayAppointment(opts: {
    title: string;
    date: string;       // yyyy-mm-dd, should fall on the chosen weekday
    week: number;       // 1–4, or -1 for "last"
    weekday: string;    // DayOfWeek name, e.g. 'FRIDAY'
    interval?: number;  // every N months (default 1)
    endDate?: string;   // optional recurrence end
  }): Promise<void> {
    await this.page.getByTestId('add-appointment').click();
    await expect(this.page.getByText('New Appointment')).toBeVisible();

    await this.page.getByTestId('appointment-title').fill(opts.title);
    await this.page.getByTestId('appointment-date').fill(opts.date);
    // All-day, so start/end times are not required to enable the save button.
    await this.page.getByTestId('appointment-allday-toggle').click();

    await this.page.getByTestId('appointment-frequency').selectOption('MONTHLY');
    await this.page.getByTestId('monthly-mode-nth').check();
    await this.page.getByLabel('Week of month').selectOption(String(opts.week));
    await this.page.getByLabel('Day of week').selectOption(opts.weekday);

    if (opts.interval && opts.interval > 1) {
      await this.page.getByLabel('Repeat interval').fill(String(opts.interval));
    }
    if (opts.endDate) {
      // The recurrence end date is the second date input in the modal.
      await this.page.locator('input[type="date"]').nth(1).fill(opts.endDate);
    }

    await this.page.getByTestId('save-appointment').click();
  }
}
