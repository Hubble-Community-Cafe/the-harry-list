# End-to-end tests (Playwright)

Drives the **real** public and admin apps against the e2e docker stack
(`../docker-compose.e2e.yml`) and asserts on real UI, database state, and email
(via Mailpit). A fuller architecture + maintenance guide lands in the docs step;
this is the quick-start.

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
# Boots the whole stack (MariaDB + backend[e2e] + Mailpit + frontends), runs the suite,
# and tears nothing down between specs (state is reset per-test via /test/reset).
npm test
```

Faster iteration against an already-running stack:
```bash
npm run stack:up            # start the stack in the background
E2E_NO_WEBSERVER=1 npm test # reuse it instead of booting a fresh one
npm run stack:down          # stop + wipe when done
```

## Evidence
- HTML report: `npm run report` (also written to `playwright-report/`).
- Traces (on retry), screenshots and video (on failure) are attached to the report.
- Emails are asserted from Mailpit (`http://localhost:8025`) and can be attached to a test.

## Layout
- `playwright.config.ts` — projects (`public`, `admin`, `mobile-public`), webServer, reporters.
- `fixtures/` — `mailpit.ts` (read delivered email), `backend.ts` (seed/reset via `/test/*`).
- `tests/<project>/` — specs per surface.
