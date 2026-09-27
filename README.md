# The Harry List

Bar reservation system for Stichting Bar Potential.

## Architecture

| Component | Stack |
|-----------|-------|
| Backend | Spring Boot 4.1 (Java 25), MariaDB |
| Admin Portal | React + TypeScript, Microsoft Entra ID auth |
| Public Form | React + TypeScript |

## Requirements

- **Java 25** (Temurin recommended): required for the backend
- **Node.js 26** (see `.nvmrc`; `nvm use` picks it up): required for the frontends
- **Docker** — required for local development and production deployment

## Local Development

1. **Create `.env`** from the example:
   ```bash
   cp .env.example .env
   ```

2. **Fill in Azure AD values** in `.env`:
   ```env
   AZURE_CLIENT_ID=your-client-id
   AZURE_TENANT_ID=your-tenant-id
   ALLOWED_GROUP_ID=your-group-id  # optional
   ```

3. **Start all services**:
   ```bash
   docker compose up --build
   ```

4. **Access**:
   - Public form: http://localhost:5173
   - Admin portal: http://localhost:5174
   - Backend API: http://localhost:8080
   - Swagger UI: http://localhost:8080/swagger-ui/index.html

## Testing

Each component has its own fast test suite:

- **Backend:** `cd the-harry-list-backend && ./mvnw test`
- **Public / Admin frontends:** `cd the-harry-list-<public|admin> && npm run test:run`

**Coverage** (report-only, no minimum yet): `./mvnw test` also writes a JaCoCo report to
`the-harry-list-backend/target/site/jacoco/index.html`, and `npm run test:coverage` writes one to
`coverage/index.html` in each frontend. CI shows the line, branch and method totals on every run's
summary page and keeps the full reports as artifacts for 14 days.

**End-to-end (Playwright):** full-stack browser tests that drive the real public + admin
apps and assert on UI, database, and email (via Mailpit), with screenshots/traces/emails as
evidence. They run on PRs via `.github/workflows/e2e.yml`.

```bash
cd e2e
npm install && npx playwright install --with-deps chromium
npm test
```

See [`e2e/README.md`](e2e/README.md) for the architecture, how to read the evidence, the
**regression coverage map**, and how to maintain/add specs.

## Production Deployment

### Prerequisites
- GitHub repository with Actions enabled
- Portainer with access to an existing MariaDB instance
- Azure AD App Registration configured

### Setup

1. **Push to `main` branch** — GitHub Actions builds and pushes Docker images to `ghcr.io`

2. **Copy `docker-compose.portainer.template.yml`** and replace:
   - `YOUR_GITHUB_USERNAME` with your GitHub username (lowercase)
   - All `__PLACEHOLDER__` values with actual configuration

3. **Required environment variables**:

   | Variable | Description |
   |----------|-------------|
   | `SPRING_DATASOURCE_URL` | MariaDB connection string |
   | `SPRING_DATASOURCE_USERNAME` | Database user |
   | `SPRING_DATASOURCE_PASSWORD` | Database password |
   | `AZURE_TENANT_ID` | Azure AD tenant ID |
   | `AZURE_CLIENT_ID` | Azure AD client ID |
   | `AZURE_CLIENT_SECRET` | Azure AD client secret (for Graph API email) |
   | `ALLOWED_GROUP_ID` | Azure AD group ID for admin access. On the admin container it gates the UI; on the backend it also rejects API tokens without that group (403). Set it on the backend only after the groups claim is enabled, see [Azure AD App Registration](#azure-ad-app-registration). |
   | `CALENDAR_FEED_TOKEN` | Token for public calendar feed. Required: without it the public feed is disabled (503) |
   | `CALENDAR_FEED_STAFF_TOKEN` | Token for staff calendar feed (with contact details). Required: without it the staff feed is disabled (503) |
   | `RECAPTCHA_ENABLED` | Set to `true` to enable reCAPTCHA (recommended for production) |
   | `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA v3 secret key (backend) |
   | `RECAPTCHA_SITE_KEY` | Google reCAPTCHA v3 site key (public frontend) |
   | `EMAIL_FROM` | Address confirmation emails are sent from. Also shown in the public confirmation screen's "check your spam folder" notice (`SENDER_EMAIL` derives from this in the compose template). |

4. **Deploy** the stack in Portainer using the modified compose file

## Production Hardening

Before going live, verify these are in place:

### HTTPS
All three services must be served over HTTPS. Terminate TLS at the reverse proxy (Traefik, nginx, Portainer proxy) the containers themselves serve HTTP internally.

### Content-Security-Policy
Both frontends send an enforcing Content-Security-Policy. It differs per app, so it lives in `nginx-csp.conf` of each frontend (the shared `nginx.conf` includes it) and is rendered at container startup with the origin of `API_URL` filled in. When a new feature needs another origin (an external API, image host or embed), add it to that app's `nginx-csp.conf`, or the browser will block it. To try a change on test without breaking anything, set `CSP_REPORT_ONLY=true` on the frontend container: violations are then only logged in the browser console. The e2e specs `public/csp` and `admin/csp` fail on any violation.

### Security scanning (CI)
- **Blocking**: each image is built and scanned with Trivy before anything is pushed. A CRITICAL vulnerability with a fix available fails the release, and no image is pushed until all three pass. The OWASP Dependency-Check job in `security.yml` fails on any backend dependency with CVSS 9 or higher.
- **Report-only**: the HIGH findings from Trivy, Semgrep and `npm audit` go to the Security tab without failing anything. Review them as part of the monthly quality check.
- **Accepting a risk**: add the CVE to `.trivyignore` (image gate) or `the-harry-list-backend/.owasp-suppressions.xml` (OWASP) with a reason and a date to look again, and remove it once the fix ships.

### Versioning
Use pinned version tags in your Portainer stack (e.g., `0.9.0`) rather than `latest`. This ensures rollbacks are reliable.

### Database
- The schema is managed by Flyway. Migrations live in `the-harry-list-backend/src/main/resources/db/migration` and run automatically when the backend starts; there are no manual migration steps anymore.
- Hibernate only validates (`SPRING_JPA_HIBERNATE_DDL_AUTO=validate`, also in the Portainer template). Never use `update`: it hides a missing migration until production.
- **Changing the schema**: add a new file `V<next number>__short_description.sql` (for example `V3__add_reservation_source.sql`) with the SQL, next to the entity change. Never edit a migration that has already run; fix it with a new one. An entity change without its migration fails at startup, locally and in e2e, before it can reach production.
- `V1__baseline.sql` is the production schema from before Flyway. Production was marked as V1 without running it; it only builds new databases (e2e, local development).
- Enums are stored as `VARCHAR` (`hibernate.type.prefer_native_enum_types=false`), so a new enum value needs no migration.
- The database user needs `CREATE`, `ALTER` and `INDEX` rights on the database, because the backend applies the migrations itself.
- Take a MariaDB backup before deploying a version that contains new migrations.

### Rate Limiting
The public reservation endpoint is rate-limited to 10 requests/minute per IP. If deploying behind a reverse proxy, ensure `X-Real-IP` is forwarded:
```nginx
proxy_set_header X-Real-IP $remote_addr;
```

### Logging
Sensitive data (passwords, tokens) is never logged. Set these in production:
```env
LOGGING_LEVEL_ROOT=INFO
LOGGING_LEVEL_COM_PIMVANLEEUWEN=INFO
LOGGING_LEVEL_HIBERNATE_SQL=WARN  # Do NOT set to DEBUG in production
```

### Monitoring
Set `SENTRY_DSN` on all three services for error tracking. The backend also exposes `/actuator/health` for uptime monitoring.

---

## Google reCAPTCHA v3 Setup

The public reservation form is protected by Google reCAPTCHA v3 to prevent bot submissions.

### Setup

1. **Register your site** at [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
   - Choose **reCAPTCHA v3**
   - Add your domains (e.g., `yourdomain.com`, `localhost` for development)

2. **Get your keys**:
   - **Site Key** (public) — Used in the frontend
   - **Secret Key** (private) — Used in the backend

3. **Set environment variables**:

   **Backend (`the-harry-list-backend`)**:
   ```env
   RECAPTCHA_ENABLED=true
   RECAPTCHA_SECRET_KEY=your-secret-key
   ```

   **Public Frontend (`the-harry-list-public`)**:
   ```env
   RECAPTCHA_SITE_KEY=your-site-key
   ```

### Development

reCAPTCHA is disabled by default in local development (`RECAPTCHA_ENABLED=false`).
To test reCAPTCHA locally, register `localhost` in the reCAPTCHA admin console and set the environment variables.

## Azure AD App Registration

Required configuration:
- **Redirect URIs**: Add your admin portal URL (e.g., `https://admin.yourdomain.com`)
- **API Permissions**: `User.Read`, `GroupMember.Read.All` (for group-based access)
- **Expose an API**: Create scope `access_as_user` with Application ID URI `api://{client-id}`
- **Client Secret**: Generate one for email functionality (backend only)
- **Groups claim** (needed for the backend staff-group check): Token configuration > Add groups claim > "Security groups" (or "All groups" if the staff group is a Microsoft 365 group), enabled for the Access token. The token then lists the user's groups and the backend requires the staff group among them. Entra leaves the claim out for users in more than 200 groups (overage); the backend then refuses them, which is safe but would lock out such a user.
- **Enterprise application**: the free Entra ID plan cannot assign groups to an application (that needs P1), so "Assignment required?" stays off and the backend group check is what keeps other tenant members out. With P1, set it to Yes and assign only the staff group as an extra layer, and switch the groups claim to "Groups assigned to the application".

## Calendar Integration

Subscribe to reservations from any calendar app (Google Calendar, Outlook, Apple Calendar) using ICS feeds.

### Two Feeds Available

| Feed | URL | Details Included |
|------|-----|------------------|
| **Public** | `/api/calendar/feed.ics` | Event info only, NO email/phone |
| **Staff** | `/api/calendar/staff-feed.ics` | ALL details including email/phone |

### Setup

1. **Generate two secure tokens** (use different tokens for each feed):
   ```bash
   openssl rand -hex 32  # For public feed
   openssl rand -hex 32  # For staff feed
   ```

2. **Set environment variables**:
   ```env
   CALENDAR_FEED_TOKEN=<public-token>
   CALENDAR_FEED_STAFF_TOKEN=<staff-token>
   ```
   Both feeds fail closed: a feed without a token answers 503, and the backend logs a warning at startup for a missing token, or when both tokens are the same (the public URL would then also open the staff feed with contact details).

3. **Subscribe** using the URLs:
   - Public: `https://your-api/api/calendar/feed.ics?token=PUBLIC_TOKEN`
   - Staff: `https://your-api/api/calendar/staff-feed.ics?token=STAFF_TOKEN`

### Subscription Instructions

| App | Steps |
|-----|-------|
| **Google Calendar** | Settings → Add calendar → From URL → Paste feed URL |
| **Outlook** | Add calendar → Subscribe from web → Paste feed URL |
| **Apple Calendar** | File → New Calendar Subscription → Paste feed URL |

### Filter Options

| Parameter | Description |
|-----------|-------------|
| `status` | Filter by status: `PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED` (comma-separated) |
| `location` | Filter by location: `HUBBLE` or `METEOR` |
| `catering` | `true` for catering events only, `false` for non-catering only (omit for all). Custom calendar appointments count as non-catering |
| `upcomingOnly` | Set to `true` for future events only |

Filters can be combined freely. Omitting a parameter leaves that dimension unfiltered, so existing feed URLs keep working unchanged.

**Examples:**
- All confirmed: `?token=XXX&status=CONFIRMED`
- Hubble upcoming: `?token=XXX&location=HUBBLE&upcomingOnly=true`
- Hubble catering only: `?token=XXX&location=HUBBLE&catering=true`
- Non-catering events: `?token=XXX&catering=false`

