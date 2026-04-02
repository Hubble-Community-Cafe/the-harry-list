import type { GuideSection } from '../components/HelpGuide';

export const dashboardGuide: GuideSection[] = [
  {
    title: 'Dashboard Overview',
    screenshot: '/screenshots/dashboard-overview.png',
    screenshotAlt: 'Dashboard with stat cards and reservation lists',
    content: `The **Dashboard** is your home screen. It gives you a quick snapshot of the current state of all reservations.

## Stat Cards

At the top you'll see four summary cards:

- **Total Reservations** — the total number of reservations in the system
- **Pending** — reservations waiting for approval (action required)
- **Confirmed** — reservations that have been approved
- **Upcoming** — confirmed reservations with an event date in the future

### Tip
Click any stat card to jump directly to the **Reservations** page with the corresponding filter pre-applied.`,
  },
  {
    title: 'Pending Approvals',
    screenshot: '/screenshots/dashboard-pending.png',
    screenshotAlt: 'Pending reservations list on the dashboard',
    content: `## Pending Approvals

Below the stat cards, you'll find the **Pending Approval** section. These are reservations that have been submitted through the public form and are waiting for a staff member to review them.

- Each card shows the **event title**, **contact name**, **date**, **time**, **location**, and **number of guests**
- Click on a reservation to go to its **detail page** where you can approve, reject, or edit it

### What to check before approving
- Is the date available? (check the **Week Overview** for conflicts)
- Are there enough staff for the requested catering activities?
- Is the guest count reasonable for the selected location?`,
  },
  {
    title: 'Recent Reservations',
    screenshot: '/screenshots/dashboard-recent.png',
    screenshotAlt: 'Recent reservations section',
    content: `## Recent Reservations

At the bottom of the dashboard, you'll see the most recently created or updated reservations across all statuses.

This is useful for quickly checking:
- Whether a reservation you just confirmed shows the correct status
- If any new reservations have come in recently
- The overall activity level

Click any reservation to view its full details.`,
  },
];

export const reservationsGuide: GuideSection[] = [
  {
    title: 'Reservations List',
    screenshot: '/screenshots/reservations-list.png',
    screenshotAlt: 'Reservations page with search and filters',
    content: `The **Reservations** page shows all reservations in the system, grouped by event date.

## Search & Filters

Use the controls at the top to narrow down what you see:

- **Search** — type to filter by event title, contact name, email, confirmation number, or ID
- **Status filter** — show only reservations with a specific status (Pending, Confirmed, Rejected, Cancelled, Completed)
- **Location filter** — show only Hubble or Meteor reservations
- **Show past events** — toggle to include events that have already happened (hidden by default)`,
  },
  {
    title: 'Reservation Cards',
    screenshot: '/screenshots/reservations-cards.png',
    screenshotAlt: 'Reservation card with status badge and details',
    content: `## Reading a Reservation Card

Each reservation card shows:

- **Status badge** — color-coded: *yellow* = Pending, *green* = Confirmed, *red* = Rejected, *grey* = Cancelled, *blue* = Completed
- **Event title** and **contact name**
- **Date and time** of the event
- **Location** — displayed as a Hubble or Meteor badge
- **Guest count**
- **Catering icon** — a fork/knife icon appears if the reservation includes catering activities

### Catering Toggle
If a reservation has catering, you'll see a catering status button. Click it to toggle whether catering has been arranged. This helps track which reservations still need catering follow-up.`,
  },
  {
    title: 'Managing a Reservation',
    screenshot: '/screenshots/reservation-detail.png',
    screenshotAlt: 'Reservation detail page with action buttons',
    content: `## Reservation Detail Page

Click any reservation card to open its **detail page**. Here you can:

### Status Actions
- **Confirm** — approve a pending reservation (sends a confirmation email to the contact)
- **Reject** — decline a reservation with an optional reason
- **Complete** — mark a confirmed reservation as completed after the event
- **Cancel** — cancel a reservation

### Other Actions
- **Edit** — modify any field (event details, contact info, dates, location, etc.)
- **Send Catering Options** — if the reservation includes catering, send an email with PDF menu attachments
- **Delete** — permanently remove the reservation

### Email Notifications
Most status changes can optionally send an email to the contact person. Use the **"Send email notification"** checkbox to control this.`,
  },
];

export const weekOverviewGuide: GuideSection[] = [
  {
    title: 'Week Overview',
    screenshot: '/screenshots/week-overview.png',
    screenshotAlt: 'Week overview grid showing 7 days with reservations',
    content: `The **Week Overview** shows a 7-day grid view (Monday to Sunday) of all reservations for the selected week.

## Navigation

- Use the **left/right arrows** to move between weeks
- Click **"This Week"** to jump back to the current week
- The **current day** is highlighted with a subtle accent

## What You See

Each day column shows:
- The **date** and **day name**
- All reservations for that day as compact cards
- A **color-coded left border** indicating the reservation status
- The **event title**, **time**, **guest count**, and **location badge**`,
  },
  {
    title: 'Filtering & Catering',
    screenshot: '/screenshots/week-overview-filters.png',
    screenshotAlt: 'Week overview filters and catering toggle',
    content: `## Filters

At the top of the page you can filter by:

- **Location** — show only Hubble, only Meteor, or both
- **Status** — show only specific statuses (e.g. only Confirmed)

## Catering Management

Reservations with catering activities show a **fork/knife icon**. You can toggle the catering status directly from the week overview:

- **Orange icon** — catering not yet arranged
- **Green icon** — catering has been arranged

This is the fastest way to track catering prep for the week ahead.

## Weekly Summary

At the top of the page, you'll see a summary bar showing the **total number of reservations** and **total guests** for the selected week, broken down by location.`,
  },
];

export const exportGuide: GuideSection[] = [
  {
    title: 'PDF Export',
    screenshot: '/screenshots/export-page.png',
    screenshotAlt: 'Export page with date picker and location selector',
    content: `The **Export** page lets you generate a **PDF report** of reservations for a specific date and location.

## How to Export

1. **Select a date** — choose the day you want the report for
2. **Select a location** — choose either Hubble or Meteor
3. **Confirmed only** — toggle this on to exclude pending, rejected, or cancelled reservations (recommended for daily prep sheets)
4. Click **"Export PDF"**

The PDF will automatically download to your device.

## When to Use This

- **Before opening** — print the day's reservation list for the bar
- **For handoff** — share with kitchen staff or event coordinators
- **For records** — keep a paper trail of daily reservations

### Tip
For a quick overview without printing, use the **Week Overview** page instead.`,
  },
];

export const calendarGuide: GuideSection[] = [
  {
    title: 'Calendar Feeds',
    screenshot: '/screenshots/calendar-feeds.png',
    screenshotAlt: 'Calendar feeds page with copy buttons and Google Calendar links',
    content: `The **Calendar Feeds** page provides ICS calendar feed URLs that you can subscribe to from any calendar app (Google Calendar, Apple Calendar, Outlook, etc.).

## Feed Types

There are two types of feeds for each location:

- **Public feed** — shows event titles, dates, and times only (no personal contact details)
- **Staff feed** — includes contact name, email, and phone number in the event description

## Available Feeds

- **Hubble Public** and **Hubble Staff**
- **Meteor Public** and **Meteor Staff**

## How to Subscribe

1. Click the **copy button** next to any feed URL
2. In your calendar app, look for "Subscribe to calendar" or "Add calendar by URL"
3. Paste the URL

### Google Calendar
Click the **"Add to Google Calendar"** link to open Google Calendar with the feed URL pre-filled.

### Important
Calendar feeds update automatically — new and changed reservations appear within a few hours. You only need to subscribe once.

Staff feed URLs contain a security token. **Do not share staff feed URLs** with people outside the team.`,
  },
];

export const emailTemplatesGuide: GuideSection[] = [
  {
    title: 'Email Templates',
    screenshot: '/screenshots/email-templates.png',
    screenshotAlt: 'Email templates page with expandable template cards',
    content: `The **Email Templates** page lets you customize the email notifications that are sent to customers when reservation statuses change.

## Template Types

Each status change has its own email template:

- **Reservation Received** — sent when a customer submits a new reservation
- **Reservation Confirmed** — sent when you approve a reservation
- **Reservation Rejected** — sent when you reject a reservation
- **Reservation Cancelled** — sent when a reservation is cancelled
- **Catering Options** — sent manually with PDF menu attachments

Click on any template card to **expand** it and see or edit its content.`,
  },
  {
    title: 'Editing Templates',
    screenshot: '/screenshots/email-templates-edit.png',
    screenshotAlt: 'Expanded email template with subject and body editor',
    content: `## Editing a Template

When you expand a template, you can modify:

- **Subject line** — the email subject
- **Body** — the full HTML email body

### Template Variables

Templates support **variables** that get replaced with actual reservation data when the email is sent. Available variables are listed above the editor. Common ones include:

- \`{{contactName}}\` — the customer's name
- \`{{eventTitle}}\` — the name of the event
- \`{{eventDate}}\` — the date of the event
- \`{{location}}\` — Hubble or Meteor
- \`{{confirmationNumber}}\` — the unique booking reference

### Actions

- **Save** — save your changes
- **Reset to Default** — revert to the original template
- **Send Test Email** — send a preview to any email address to check how it looks

### Tip
The body uses **HTML**. If you're not comfortable editing HTML, only change the text content and leave the HTML tags intact.`,
  },
  {
    title: 'PDF Attachments',
    screenshot: '/screenshots/email-attachments.png',
    screenshotAlt: 'PDF attachments section with upload form and attachment list',
    content: `## PDF Attachments

Below the email templates, you'll find the **PDF Attachments** section. These are PDF files (like catering menus) that can be attached when sending catering option emails.

### Uploading a PDF

1. Enter a **display name** (e.g. "Catering Menu 2026")
2. Click **"Choose file"** and select a PDF file (max 3 MB)
3. Click **Upload**

### Managing Attachments

- **Active/Inactive toggle** — only active attachments are pre-selected when sending catering emails
- **Delete** — permanently remove an attachment

### How Attachments Are Used

When you send a **"Catering Options"** email from a reservation's detail page, all active attachments are pre-selected. You can uncheck any you don't want to include for that specific email.`,
  },
];

export const formSettingsGuide: GuideSection[] = [
  {
    title: 'Form Settings Overview',
    screenshot: '/screenshots/form-settings.png',
    screenshotAlt: 'Form settings page with constraints and blocked periods tabs',
    content: `The **Form Settings** page controls the rules and restrictions applied to the public reservation form. It has two main sections:

- **Form Constraints** — rules that validate or restrict what customers can select
- **Blocked Periods** — specific date ranges when reservations are not allowed

These settings directly affect what customers see and can do on the public reservation form.`,
  },
  {
    title: 'Form Constraints',
    screenshot: '/screenshots/form-constraints.png',
    screenshotAlt: 'Form constraints list with type badges and toggle switches',
    content: `## Form Constraints

Constraints are rules that enforce business logic on the reservation form. Each constraint has:

- **Type** — what kind of rule it is
- **Message** — the error message shown to the customer
- **Enabled/Disabled toggle** — turn rules on or off without deleting them

### Constraint Types

- **Activity Conflict** — prevents combining incompatible activities (e.g. catering + à la carte)
- **Location Lock** — forces a specific location when a certain activity is selected (e.g. Corona Room → Hubble)
- **Advance Booking** — requires a minimum number of days between booking and event date
- **Time Restriction** — limits available time slots for certain activities
- **Guest Minimum** — sets a minimum guest count for a specific location (e.g. Meteor minimum 1 person)

### Adding a Constraint

Click **"Add Constraint"** and fill in:
1. **Constraint type** — select from the dropdown
2. **Trigger activity** — which activity triggers this rule (not needed for Guest Minimum)
3. **Target value** — what the rule applies to (location, conflicting activity, etc.)
4. **Numeric value** — for rules that need a number (days, minimum guests)
5. **Message** — the error text customers will see`,
  },
  {
    title: 'Blocked Periods',
    screenshot: '/screenshots/form-blocked-periods.png',
    screenshotAlt: 'Blocked periods list with date ranges and location badges',
    content: `## Blocked Periods

Blocked periods prevent customers from making reservations during specific date ranges. Use these for:

- **Holidays** — Christmas, New Year's, etc.
- **Maintenance** — planned closures
- **Private events** — when the venue is booked exclusively
- **Seasonal closures** — summer or winter breaks

### Creating a Blocked Period

Click **"Add Blocked Period"** and fill in:
1. **Start date** and **End date** — the date range to block
2. **Location** — optionally limit the block to just Hubble or Meteor (leave empty for both)
3. **Reason** — internal note for staff (not shown to customers)
4. **Public message** — the message customers see when trying to book these dates
5. **Enabled** — toggle on/off

### Tip
You can create blocked periods in advance. Use the **enabled toggle** to activate them when needed instead of creating and deleting them each time.`,
  },
  {
    title: 'Data Retention',
    screenshot: '/screenshots/form-data-retention.png',
    screenshotAlt: 'Data retention section showing retention period and status',
    content: `## Data Retention

At the bottom of the page, you'll see the **Data Retention** settings. This shows how long reservation data is kept before being automatically deleted.

### What You See

- **Retention period** — how many days after the event date reservations are kept (e.g. 365 days)
- **Status** — whether automatic deletion is enabled
- **Eligible for deletion** — how many reservations would be deleted in the next run
- **Next run** — when the next automatic cleanup will happen (daily at 2:00 AM)
- **Cutoff date** — reservations with event dates before this date will be deleted

### Important
Data retention settings can **only be changed** through the server configuration (Docker Compose). Staff cannot modify these settings from the admin panel — they are displayed here for transparency only.

This is a privacy and compliance measure to ensure old personal data (names, emails, phone numbers) is not kept longer than necessary.`,
  },
];

export const reservationDetailGuide: GuideSection[] = [
  {
    title: 'Reservation Details',
    screenshot: '/screenshots/reservation-detail-overview.png',
    screenshotAlt: 'Reservation detail page showing all fields',
    content: `The **Reservation Detail** page shows all information about a single reservation.

## Information Sections

- **Contact Information** — name, email, phone number
- **Event Details** — title, date, start/end time, location, guest count
- **Activities** — selected special activities (catering, à la carte, etc.)
- **Additional Notes** — any comments the customer added
- **Payment** — payment option and invoice details (if applicable)
- **Status History** — who confirmed/rejected and when`,
  },
  {
    title: 'Status Actions',
    screenshot: '/screenshots/reservation-actions.png',
    screenshotAlt: 'Action buttons for confirming, rejecting, and managing reservations',
    content: `## Status Actions

The available actions depend on the current status:

### Pending Reservations
- **Confirm** — approve the reservation. Optionally sends a confirmation email
- **Reject** — decline with an optional reason (included in the rejection email)

### Confirmed Reservations
- **Complete** — mark as completed after the event has taken place
- **Cancel** — cancel the reservation (e.g. customer called to cancel)

### All Reservations
- **Edit** — open the edit form to change any field
- **Delete** — permanently remove (with confirmation dialog)

### Email Notifications
Each status change dialog has a **"Send email notification"** checkbox. Keep this checked to automatically notify the customer. Uncheck it only if you've already communicated with them directly.`,
  },
  {
    title: 'Catering Email',
    screenshot: '/screenshots/reservation-catering-email.png',
    screenshotAlt: 'Catering email dialog with attachment checkboxes',
    content: `## Sending Catering Options

For reservations that include catering activities, you'll see a **"Send Catering Options"** button.

### How It Works

1. Click **"Send Catering Options"**
2. The dialog shows a pre-filled email with:
   - **Recipient** — the customer's email
   - **Reply-to** — where the customer's reply will go (fill in your own email or the staff inbox)
   - **Attachments** — all active PDF menus (pre-checked, uncheck any you don't want to include)
   - **Subject** — pre-filled from the template
   - **Body** — pre-filled HTML email body
3. Optionally edit the subject or body for this specific email
4. Click **Send**

### Tip
Make sure you have **PDF attachments uploaded** on the Email Templates page before sending catering emails. The email can be sent without attachments, but it's most useful when menus are attached.`,
  },
];
