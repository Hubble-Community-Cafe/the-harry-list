# Contributing to The Harry List

Thanks for your interest in contributing to The Harry List! This is the reservation system for [Stichting Bar Potential](https://hubble.cafe)'s community cafes — Hubble and Meteor.

## Getting Started

1. **Fork** the repository and clone your fork
2. Set up local development (see [README.md](README.md#local-development))
3. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Project Structure

This is a monorepo with three components:

| Directory | What | Stack |
|-----------|------|-------|
| `the-harry-list-backend` | REST API | Spring Boot, Java, MariaDB |
| `the-harry-list-admin` | Admin portal | React, TypeScript, Vite |
| `the-harry-list-public` | Public reservation form | React, TypeScript, Vite |

## Development Workflow

### Before You Code

- Check the [existing issues](../../issues) to see if someone is already working on it
- For larger changes, open an issue first to discuss the approach
- For bug fixes, a PR is usually fine without prior discussion

### Writing Code

- **Tests are required** — all new features and bug fixes should include tests
  - Backend: JUnit 5 + Mockito (`src/test/`)
  - Frontends: Vitest + React Testing Library (`src/test/`)
- **Run tests before pushing**:
  ```bash
  # Backend
  cd the-harry-list-backend && ./mvnw test

  # Admin frontend
  cd the-harry-list-admin && npm test

  # Public frontend
  cd the-harry-list-public && npm test
  ```
- **Run the linter** on frontend changes:
  ```bash
  npm run lint
  ```
- Don't commit secrets, `.env` files, or credentials

### Commit Messages

Use clear, descriptive commit messages. We loosely follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add calendar appointment recurrence support
fix: correct reply-to header on catering emails
build(deps): bump spring-boot from 3.4 to 3.5
docs: update calendar feed setup instructions
```

### Pull Requests

- Open PRs against `main`
- Fill in the PR template — describe what changed and why
- Make sure CI passes (tests + build)
- All PRs require review from @PimVanLeeuwen before merging
- Keep PRs focused — one feature or fix per PR

## Dependency Updates

Dependency bumps are handled by Dependabot and do **not** follow the normal "open a PR against `main`" flow. They target a long-lived **`develop`** branch instead.

**Why:** `main` requires the *Version Bump Check* (see [`.github/workflows/ci.yml`](.github/workflows/ci.yml)), which fails any PR that doesn't raise the app version across all three packages. Dependabot never bumps the app version, so its PRs can't merge to `main` directly. `develop` is kept one patch ahead of `main`, so Dependabot PRs inherit that bumped version, pass the check, and merge individually.

**How it flows:**

1. Every Monday, Dependabot opens grouped PRs against `develop`, at most one batched *minor/patch* PR and one isolated *major* PR per ecosystem (Maven, admin npm, public npm, GitHub Actions). See [`.github/dependabot.yml`](.github/dependabot.yml).
2. Minor/patch PRs are **auto-merged** into `develop` once CI passes, via [`.github/workflows/dependabot-auto-merge.yml`](.github/workflows/dependabot-auto-merge.yml). Major updates are commented and left open for manual review.
3. To release the accumulated updates, open a single **`develop → main`** PR. It already carries the version bump, so it passes the Version Bump Check.
4. After the release merges, reset `develop` back onto `main` and open the next
   patch cycle:
   ```bash
   ./scripts/release-reset-develop.sh
   ```
   (Pass an explicit version to override the auto-incremented patch, e.g. `./scripts/release-reset-develop.sh 1.8.0`.)

## Reporting Bugs

Use the [bug report template](../../issues/new?template=bug_report.md). Include:
- Which component is affected (backend, admin, public form)
- Steps to reproduce
- Expected vs. actual behavior
- Browser/device info for frontend issues

## Requesting Features

Use the [feature request template](../../issues/new?template=feature_request.md). Describe the problem you're trying to solve, not just the solution you have in mind.

## Security Vulnerabilities

**Do not open a public issue for security vulnerabilities.** See [SECURITY.md](SECURITY.md) for responsible disclosure instructions.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it. Report unacceptable behavior to pim@hubble.cafe.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).