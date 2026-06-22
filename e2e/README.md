# End-to-end tests (Playwright)

These tests drive the **real** public and admin apps against a throwaway full stack and
assert on real UI, database state, and email — with screenshots, traces, and the actual
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
                            ├── MariaDB (tmpfs — clean every boot)
                            └── SMTP ──► Mailpit (http://localhost:8025, REST API)
```

Everything is launched by `docker-compose.e2e.yml` (repo root). The backend runs the
**`e2e` Spring profile**, which swaps in test-only behaviour that never exists in dev/prod:

- **Email** goes over SMTP to **Mailpit** (`SmtpEmailService`, `@Profile("e2e")`) instead of
  Microsoft Graph, so tests can read the real rendered messages.
- **Auth** is header-based (`E2eSecurityConfig`): the admin app and API requests send
  `X-Test-Oid`, and the real `RoleAuthorizationFilter` resolves the role from the DB — so
  RBAC and audit attribution behave exactly like production.
- **Seed/reset** endpoints (`TestSupportController`, `/test/*`) let specs set up and clear
  state without going through Azure-authenticated APIs.

All of the above is gated to the `e2e` profile and verified by `E2eProfileGuardTest` — it
cannot load in dev or production.

The **admin app** participates via an env-gated bridge (`lib/e2eAuth.ts`): when
`E2E_AUTH_OID` is injected at runtime (only by `docker-compose.e2e.yml`), it skips MSAL and
sends the `X-Test-*` headers. Inert everywhere else.

## Prerequisites

- Docker (to boot the stack) and Node 20+.

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

- **Trace** for every test (`trace: 'on'`) — an interactive timeline (DOM/network/console).
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
  and the page object — not every spec.
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
> strict — prefer `getByRole('heading', …)` or a test id when text repeats (nav + heading);
> confirming a reservation requires a concrete location; activity conflicts are seeded in
> both directions.

## Regression coverage map

E2E asserts journeys + wiring with a representative case; the exhaustive matrix lives in the
faster layers.

| Area | Unit / component | Backend integration | E2E spec |
|------|------------------|---------------------|----------|
| Make a reservation (happy + many options) | form unit tests | `CreateReservationService*` | `public/happy-path`, `public/booking-options` |
| Sender / spam-folder notice on confirmation (#310) | `SuccessMessage` test | — | `public/happy-path` |
| Soft / hard blocked periods | `blockedPeriods` + form tests | `ConstraintValidationServiceTest` | `public/soft-block`, `public/hard-block`, `admin/blocked-periods` |
| Form constraints (all types) | form tests | `ConstraintValidationServiceTest` | `public/constraints-blocking`, `public/constraints-dynamic`, `admin/constraints-roundtrip` |
| Activity notice (advisory, non-blocking) | `ReservationForm` + `FormSettingsPage` tests | `ConstraintValidationServiceTest` | `public/activity-notice` |
| Confirm a reservation (appears in admin) | `ReservationsPage`/detail tests | controller tests | `admin/reservation-lifecycle` #1 |
| Edit / remove a reservation | `ReservationDetailPage` test | `Update`/`DeleteReservationServiceTest` | `admin/reservation-lifecycle` #2 |
| Seating area (inside/outside) shown in detail (#292) | `ReservationDetailPage` test | — | `admin/reservation-lifecycle` #2 |
| Reopen a rejected reservation to pending | `ReservationDetailPage` test | `AdminReservationControllerTest` | `admin/reservation-lifecycle` #3 |
| Status-change email + custom message | — | `AdminReservationControllerTest` | `admin/status-email` |
| Editable email templates | — | `EmailTemplateServiceTest` | `admin/email-template` |
| RBAC (viewer/editor/admin) | `usePermissions` | filter tests | `admin/rbac` |
| Audit log | `AuditDiff`/`AuditService` | controller tests | `admin/audit-log` |
| Catering-only export (#280) | — | `PdfExportServiceTest` | `admin/catering-export` |
| Appointments on the PDF export (#303) | — | `PdfExportServiceTest`, `AppointmentRecurrenceServiceTest` | `admin/appointments-export` |
| Week overview | `WeekOverviewPage` test | — | `admin/week-overview` |
| Calendar feeds (iCal) incl. catering filter (#309) | — | `ICalendarServiceTest`, `ReservationTest` | `public/calendar-feed` |
| Recurring appointments (incl. "Nth weekday", #286) | `recurrence` + `CalendarAppointmentsPage` tests | `ICalendarServiceTest` | `admin/calendar-appointments` |
| Mobile date/time fields (#253) | — | — | `mobile-public/datetime` |

## CI

`.github/workflows/e2e.yml` runs the suite on PRs to `main` (and on demand), boots the
stack, writes a per-test summary table to the run page, and uploads the HTML report +
traces/screenshots/videos. Making it a required check is a branch-protection setting.
