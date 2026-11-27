# End-to-end tests (Playwright)

These tests drive the **real** public and admin apps against a throwaway full stack and
assert on real UI, database state, and email: with screenshots, traces, and the actual
delivered emails attached to the report as evidence.

They complement (not replace) the fast layers: most logic is covered by backend unit/
integration tests and frontend component tests. E2E covers the **critical user journeys
and the wiring between the apps**. See the [coverage map](#regression-coverage-map).

## Architecture

```
Playwright (chromium)
  ├── public app   (http://localhost:5173)  ─┐
  └── admin app    (http://localhost:5174)  ─┤ HTTP
                                              ▼
                          backend  (http://localhost:8080, Spring profile "e2e")
                            ├── MariaDB (tmpfs: clean every boot)
                            └── SMTP ──► Mailpit (http://localhost:8025, REST API)
```

Everything is launched by `docker-compose.e2e.yml` (repo root). The backend runs the
**`e2e` Spring profile**, which swaps in test-only behaviour that never exists in dev/prod:

- **Email** goes over SMTP to **Mailpit** (`SmtpMailTransport`, wired in `MailConfig` under
  `@Profile("e2e")`) instead of Microsoft Graph. Only the delivery differs: the messages come from
  the same `ReservationEmailService` and `EmailMessages` as production, so tests read the real
  rendered messages.
- **Auth** is header-based (`E2eSecurityConfig`): the admin app and API requests send
  `X-Test-Oid`, and the real `RoleAuthorizationFilter` resolves the role from the DB: so
  RBAC and audit attribution behave exactly like production.
- **Seed/reset** endpoints (`TestSupportController`, `/test/*`) let specs set up and clear
  state without going through Azure-authenticated APIs.

All of the above is gated to the `e2e` profile and verified by `E2eProfileGuardTest`: it
cannot load in dev or production.

The **admin app** participates via an env-gated bridge (`lib/e2eAuth.ts`): when
`E2E_AUTH_OID` is injected at runtime (only by `docker-compose.e2e.yml`), it skips MSAL and
sends the `X-Test-*` headers. Inert everywhere else.

## Prerequisites

- Docker (to boot the stack) and Node 26 (see `.nvmrc` in the repo root).

## Install

```bash
cd e2e
npm install
npx playwright install --with-deps chromium
```

## Run

```bash
# Boots the whole stack, runs the suite, resets state per-test via /test/reset.
npm test
```

Faster iteration against an already-running stack:

```bash
npm run stack:up              # start the stack in the background
E2E_NO_WEBSERVER=1 npm test   # reuse it instead of booting a fresh one
npm run stack:down            # stop + wipe when done
```

Useful flags: `npm test -- public/soft-block.spec.ts` (one file), `npm run test:headed`,
`npm run test:ui`, `npm run report` (open the last HTML report), `npm run typecheck`.

## Evidence

Every run is self-documenting:

- **Trace** for every test (`trace: 'on'`): an interactive timeline (DOM/network/console).
  Open with `npx playwright show-trace <trace.zip>` or drag it into
  [trace.playwright.dev](https://trace.playwright.dev).
- **Curated screenshots** at key moments via `captureScreenshot` (animations disabled so the
  final state is captured, not a mid-transition frame).
- **Real emails** from Mailpit attached as HTML (`attachHtml`), the catering PDF, the iCal
  feed, and DB/API snapshots (`attachJson`).
- Screenshots + video are also auto-captured on failure.

In CI (`.github/workflows/e2e.yml`) a per-test summary table (status, duration, errors) is
written directly to the GitHub Actions run page via `@estruyf/github-actions-reporter`, so
you can see results without downloading anything. The HTML report and all artifacts are also
uploaded, and the backend log is dumped on failure.

## Layout

```
e2e/
  playwright.config.ts        projects (public, admin, mobile-public), webServer, reporters
  fixtures/
    backend.ts                /test/* seed + reset helpers, admin auth headers
    mailpit.ts                read/clear/poll delivered email
    evidence.ts               screenshot / html / json / text attachments
  pages/
    ReservationFormPage.ts    the public multi-step form
    AdminSettingsPage.ts      admin Form Settings (constraints + blocked periods)
  tests/
    public/                   public reservation form journeys
    admin/                    admin journeys (API + UI)
    mobile-public/            phone-viewport (Pixel 5 / chromium)
```

## How the pieces fit (for writing/maintaining specs)

- **Selectors** are `data-testid`-first. When the UI changes, update the test id in the app
  and the page object: not every spec.
- **Page objects** (`pages/`) own the selectors and flows for a screen. Specs read as prose.
- **Seeding** goes through `fixtures/backend.ts` (`/test/*`), never the UI, so tests start
  from a known state and stay isolated (`resetBackend` in `beforeEach`).
- **Admin auth**: seed a user with `seedUser({ oid: 'e2e-admin', role })`; the admin SPA uses
  `e2e-admin`. For direct API calls use `adminAuthHeaders(oid)`.

### When a feature changes
1. Update the affected component's `data-testid`(s) if markup changed.
2. Update the relevant **page object** method(s).
3. Run the affected spec; update assertions/seed data if behaviour legitimately changed.
4. If a user journey changed, update (or add) its spec.

### When you add a user-facing feature
1. Add `data-testid` hooks to the new controls.
2. Add a page-object method if it's a new screen/flow.
3. Seed via a `/test/*` helper (extend `TestSupportController` + `fixtures/backend.ts` if needed).
4. Write the spec, attach evidence (screenshot / email / etc.).
5. Add a row to the coverage map below.

> Gotchas worth knowing: hidden radios need `.check({ force: true })`; `getByText` is
> strict: prefer `getByRole('heading', …)` or a test id when text repeats (nav + heading);
> confirming a reservation requires a concrete location; activity conflicts are seeded in
> both directions.

## Regression coverage map

E2E asserts journeys + wiring with a representative case; the exhaustive matrix lives in the
faster layers.

| Area | Unit / component | Backend integration | E2E spec |
|------|------------------|---------------------|----------|
| Make a reservation (happy + many options) | form unit tests | `CreateReservationService*` | `public/happy-path`, `public/booking-options` |
| Step navigation: one Continue click advances after fixing errors, opening the review step never submits or shows the terms error, the review shows a readable date and location | `ReservationForm` + `formatDate` tests | n/a | `public/step-navigation` |
| Sender / spam-folder notice on confirmation (#310) | `SuccessMessage` test | n/a | `public/happy-path` |
| Staff inbox comes only from `APP_MAIL_STAFF`: new reservation alert, guest Reply-To, catering default Reply-To | `ReservationDetailPage` test | `EmailMessagesTest`, `EmailTemplateServiceTest`, `AdminReservationControllerTest` | `public/happy-path` |
| Soft / hard blocked periods, and a blocked Continue focusing the notice or box that explains why | `blockedPeriods` + form tests | `ConstraintValidationServiceTest`, `FormOptionsControllerTest` (staff-only reason never public) | `public/soft-block`, `public/hard-block`, `admin/blocked-periods` |
| Form constraints (all types), and a forced location (small group or activity lock) or seating giving the guest's own choice back once it lifts | form tests | `ConstraintValidationServiceTest` | `public/constraints-blocking`, `public/constraints-dynamic`, `admin/constraints-roundtrip` |
| Activity notice (advisory banner, opt-in confirmation dialog, optional location and minimum-guest conditions) | `ReservationForm` + `FormSettingsPage` tests | `ConstraintValidationServiceTest` | `public/activity-notice` |
| Retired private-event activity (form, options API, direct submit) | `ReservationForm` + `ReservationDetailPage` tests | `FormOptionsControllerTest`, `CreateReservationServiceTest` | `public/retired-activity` |
| Privacy policy (GDPR notice + dialog) | `PrivacyPolicy` + `Footer` tests | n/a | `public/privacy-policy` |
| Self-hosted fonts, no requests to Google Fonts (#449); subtitles use Lato Light (weight 300), small labels stay regular | n/a | n/a | `public/self-hosted-fonts`, `admin/self-hosted-fonts` |
| Content-Security-Policy enforced, no violations (full form incl. ALTCHA, every admin page) (#448) | `zodConfig` test | n/a | `public/csp`, `admin/csp` |
| Security headers and CSP on every nginx response: page, static assets, runtime config, health check; runtime config and public folder files are revalidated on every load, hashed bundles cached a year with one Cache-Control header | n/a | n/a | `public/security-headers`, `admin/security-headers` |
| Accessibility, WCAG 2.2 AA via axe: every form step, validation errors, confirmation and privacy dialog, every admin page, the admin edit and help dialogs (reservation, appointment, constraint, blocked period, help), admin pages and the open menu at phone width, light and dark theme, desktop and mobile (#457) | admin page tests (fields found by their labels) | n/a | `public/accessibility`, `mobile-public/accessibility`, `admin/accessibility` |
| Skip to content link, and admin focus moves to the page content after navigating (#458); admin tab title per page, named menu button, closed phone menu out of the tab order, Escape closes it | `SkipLink` + `Layout` + `HelpGuide` + `ThemeToggle` tests | n/a | `public/accessibility`, `admin/accessibility` (keyboard tests) |
| Public form semantics: fields marked invalid and linked to their errors, named choice groups, focus moves to the step heading on Continue, progress says which steps are completed, focused choice cards show a ring; field edges at 3:1 in both themes; dialog titles readable on the dialog panel in both themes | `ReservationForm` tests | n/a | `public/accessibility` (keyboard tests, field edge colour, dialog title colour) |
| Pages and form parts load on demand; a stale tab reloads once after a deploy, without a reload loop (#459) | `chunkReload` + `App` tests | n/a | `admin/stale-deploy`, and every admin and form spec loads the chunks |
| Unsaved changes: leaving via sidebar or browser back, closing a dialog with X, switching templates, closing the tab (#460) | `useUnsavedChanges` + page tests (reservation, templates, settings, appointments) | n/a | `admin/unsaved-changes` |
| Dialogs (shared `Modal`, both apps): announced and named, focus moves in and stays inside, Escape closes only the top dialog, focus returns to the opener | `Modal` (shared), `ConfirmDialog` + `ReservationDetailPage` tests | n/a | `admin/accessibility` (keyboard test) |
| Confirm a reservation (appears in admin), with a line saying what happened and who is emailed | `ReservationsPage`/detail tests | controller tests | `admin/reservation-lifecycle` #1 |
| Admin shows words, not stored codes (status, location, payment, seating, invoice type, activity, role, change history) | `labels` + page tests | n/a | `admin/reservation-lifecycle`, `admin/week-overview` |
| Edit / permanently delete a reservation (delete asks first and says whether an email goes out; a failed action or save keeps the page and the input) | `ReservationDetailPage` test | `Update`/`DeleteReservationServiceTest` | `admin/reservation-lifecycle` #2 |
| Seating area (inside/outside) shown in detail (#292) | `ReservationDetailPage` test | n/a | `admin/reservation-lifecycle` #2 |
| Reopen a rejected or cancelled reservation to pending | `ReservationDetailPage` test | `AdminReservationControllerTest` | `admin/reservation-lifecycle` #3, #4 |
| Allowed status transitions only (pending to confirmed/rejected, confirmed to cancelled, rejected/cancelled to pending) | n/a | `ReservationStatusTest`, `AdminReservationControllerTest` | `admin/reservation-lifecycle` |
| Staff edits skip the public form rules (constraints, blocked periods, retired activities) | n/a | `UpdateReservationServiceTest` | n/a |
| Status-change email + custom message | n/a | `AdminReservationControllerTest` | `admin/status-email` |
| Editable email templates | n/a | `EmailTemplateServiceTest` | `admin/email-template` |
| RBAC (viewer/editor/admin), incl. staff reservation endpoints and the backend staff-group check | `usePermissions` | filter tests, `ReservationControllerTest`, `EndpointAuthorizationGuardTest` | `admin/rbac` |
| Admin access follows the backend staff-group check: outsiders see Access denied, members the app (no Graph lookup in the browser) | `RoleContext`, `api` 403 handling | `RoleAuthorizationFilterTest` | `admin/access-denied` |
| API error responses: one problem+json shape (`detail`, validation `errors`) | shared `apiErrorMessage`, public `lib/api` | `AdminReservationControllerTest`, `PublicReservationControllerTest`, `AdminEmailAttachmentControllerTest`, filter tests | `admin/rbac` |
| Audit log | `AuditDiff`/`AuditService` | controller tests | `admin/audit-log` |
| Catering-only export (#280) | n/a | `PdfExportServiceTest` | `admin/catering-export` |
| Appointments on the PDF export (#303) | n/a | `PdfExportServiceTest`, `AppointmentRecurrenceServiceTest` | `admin/appointments-export` |
| Week overview | `WeekOverviewPage` test | n/a | `admin/week-overview` |
| Catering toggle on reservation cards (list and week): its own control on top of the card link, named by state and event, keyboard reachable, a failed save says so on the card | `ReservationsPage` + `WeekOverviewPage` tests | n/a | `admin/week-overview` |
| Calendar feeds (iCal) incl. catering filter (#309), fail closed without a token (#450) | n/a | `ICalendarServiceTest`, `ReservationTest`, `CalendarFeedControllerTest` | `public/calendar-feed` |
| Recurring appointments (incl. "Nth weekday", #286) | `recurrence` + `CalendarAppointmentsPage` tests | `ICalendarServiceTest` | `admin/calendar-appointments` |
| Mobile date/time fields (#253) | n/a | n/a | `mobile-public/datetime` |

## CI

`.github/workflows/e2e.yml` runs the suite on PRs to `main` and `develop`, nightly, and on
demand. It boots the stack, writes a per-test summary table to the run page, and uploads the
HTML report + traces/screenshots/videos. "Playwright E2E" is a required check on `develop`
(branch protection), so Dependabot's auto-merge waits for the browser suite as well.
