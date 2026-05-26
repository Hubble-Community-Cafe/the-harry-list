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