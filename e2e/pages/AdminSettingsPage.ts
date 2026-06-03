import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page object for the admin Form Settings page (constraints + blocked periods).
 * Centralizes selectors so feature changes touch this file, not every spec.
 */
export class AdminSettingsPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/settings');
    await expect(this.page.getByText('Settings')).toBeVisible();
  }

  async openBlockedPeriodsTab(): Promise<void> {
    await this.page.getByRole('button', { name: /Blocked Periods/ }).click();
  }

  // ---- Form constraints ----
  constraintRows(): Locator {
    return this.page.getByTestId('constraint-row');
  }

  /** Create a form constraint through the editor modal. */
  async createConstraint(opts: {
    type: string;
    triggerActivity?: string;
    targetValue?: string;
    numericValue?: number;
    message: string;
  }): Promise<void> {
    await this.page.getByTestId('add-constraint').click();
    await this.page.getByTestId('constraint-type').selectOption(opts.type);
    if (opts.triggerActivity) {
      await this.page.getByTestId('constraint-trigger').selectOption(opts.triggerActivity);
    }
    if (opts.targetValue !== undefined) {
      await this.page.getByTestId('constraint-target').fill(opts.targetValue);
    }
    if (opts.numericValue !== undefined) {
      await this.page.getByTestId('constraint-numeric').fill(String(opts.numericValue));
    }
    await this.page.getByTestId('constraint-message').fill(opts.message);
    await this.page.getByTestId('save-constraint').click();
  }

  async openNewBlockedPeriod(): Promise<void> {
    await this.page.getByTestId('add-blocked-period').click();
    await expect(this.page.getByText('New Blocked Period')).toBeVisible();
  }

  softBlockToggle(): Locator {
    return this.page.getByTestId('soft-block-toggle');
  }

  ackTextInput(): Locator {
    return this.page.getByTestId('ack-text-input');
  }

  blockedPeriodRows(): Locator {
    return this.page.getByTestId('blocked-period-row');
  }

  softBlockBadge(): Locator {
    return this.page.getByTestId('soft-block-badge');
  }

  async saveBlockedPeriod(): Promise<void> {
    await this.page.getByTestId('save-blocked-period').click();
  }

  /**
   * Fill and save a new blocked period from the editor modal. The modal's date/reason
   * fields have no test ids yet, so they're located by type/placeholder within the modal.
   */
  async createBlockedPeriod(opts: {
    startDate: string;
    endDate: string;
    reason: string;
    publicMessage?: string;
    soft?: boolean;
    acknowledgementText?: string;
  }): Promise<void> {
    await this.openNewBlockedPeriod();

    const dates = this.page.locator('input[type="date"]');
    await dates.nth(0).fill(opts.startDate);
    await dates.nth(1).fill(opts.endDate);
    await this.page.getByPlaceholder('e.g. Holiday closure, Maintenance').fill(opts.reason);
    if (opts.publicMessage) {
      await this.page.getByPlaceholder('e.g. Closed for maintenance').fill(opts.publicMessage);
    }
    if (opts.soft) {
      await this.softBlockToggle().click();
      if (opts.acknowledgementText) {
        await this.ackTextInput().fill(opts.acknowledgementText);
      }
    }
    await this.saveBlockedPeriod();
  }
}
