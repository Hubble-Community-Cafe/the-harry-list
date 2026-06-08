import { type Page, type Locator, expect } from '@playwright/test';

export interface ContactInfo {
  name: string;
  email: string;
}

export interface ActivityInfo {
  title: string;
  description?: string;
  date: string; // yyyy-mm-dd
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  guests?: number;
}

export type Location = 'HUBBLE' | 'METEOR' | 'NO_PREFERENCE';
export type Seating = 'INSIDE' | 'OUTSIDE';

/**
 * Page object for the public multi-step reservation form.
 *
 * Selectors are centralized here: when the form's markup changes, update this file
 * (and the data-testid hooks in ReservationForm.tsx) — not every spec.
 */
export class ReservationFormPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.page.getByText('Contact Information')).toBeVisible();
  }

  continueButton(): Locator {
    return this.page.getByRole('button', { name: 'Continue' });
  }

  async continue(): Promise<void> {
    await this.continueButton().click();
  }

  async expectStep(heading: string): Promise<void> {
    await expect(this.page.getByText(heading)).toBeVisible();
  }

  // ---- Step 1: Contact ----
  async fillContact({ name, email }: ContactInfo): Promise<void> {
    await this.page.getByTestId('contact-name').fill(name);
    await this.page.getByTestId('contact-email').fill(email);
  }

  // ---- Step 2: Activity ----
  async fillActivity({
    title,
    description = 'E2E test event',
    date,
    startTime = '14:00',
    endTime = '16:00',
    guests,
  }: ActivityInfo): Promise<void> {
    await this.page.getByTestId('event-title').fill(title);
    await this.page.getByPlaceholder('Tell us more about your event...').fill(description);
    await this.page.getByTestId('event-date').fill(date);
    await this.page.getByTestId('start-time').selectOption(startTime);
    await this.page.getByTestId('end-time').selectOption(endTime);
    if (guests !== undefined) {
      await this.page.getByTestId('expected-guests').fill(String(guests));
    }
  }

  /** Toggle a special activity by its visible label (e.g. "Catering"). */
  async toggleActivity(label: string): Promise<void> {
    await this.page.getByText(label, { exact: true }).click();
  }

  // ---- Blocked-period notice (soft or hard) ----
  blockedNotice(): Locator {
    return this.page.getByTestId('blocked-date-notice');
  }

  softAckCheckbox(): Locator {
    return this.page.getByTestId('soft-block-ack');
  }

  softAckError(): Locator {
    return this.page.getByTestId('soft-block-ack-error');
  }

  async acknowledgeSoftBlock(): Promise<void> {
    await this.softAckCheckbox().check();
  }

  // ---- Step 3: Location & seating (radios are visually hidden -> force) ----
  async selectLocation(location: Location): Promise<void> {
    await this.page.getByTestId(`location-${location}`).check({ force: true });
  }

  async selectSeating(seating: Seating): Promise<void> {
    await this.page.getByTestId(`seating-${seating}`).check({ force: true });
  }

  // ---- Step 4: Payment ----
  async selectPayment(label: string): Promise<void> {
    await this.page.getByText(label, { exact: true }).click();
  }

  // ---- Step 5: Confirm ----
  async acceptTerms(): Promise<void> {
    await this.page.getByTestId('terms-accepted').check();
  }

  async submit(): Promise<void> {
    await this.page.getByTestId('submit-reservation').click();
  }

  // ---- Confirmation result ----
  /** The "check your spam / sender address" notice shown on the confirmation screen. */
  senderNotice(): Locator {
    return this.page.getByTestId('sender-notice');
  }

  /**
   * Drive every step of a clean booking (no blocks/constraints in the way).
   * Leaves the form on the confirmation result.
   */
  async completeBooking(opts: {
    contact: ContactInfo;
    activity: ActivityInfo;
    location?: Location;
    seating?: Seating;
    payment?: string;
  }): Promise<void> {
    await this.fillContact(opts.contact);
    await this.continue();
    await this.fillActivity(opts.activity);
    await this.continue();
    await this.selectLocation(opts.location ?? 'NO_PREFERENCE');
    await this.selectSeating(opts.seating ?? 'INSIDE');
    await this.continue();
    await this.selectPayment(opts.payment ?? 'People pay individually');
    await this.continue();
    await this.acceptTerms();
    await this.submit();
  }
}
