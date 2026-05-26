# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest release | Yes |
| Older releases | No |

We only address security issues in the latest release. Please update before reporting.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, report vulnerabilities privately by emailing **pim@hubble.cafe**. Include:

- A description of the vulnerability
- Steps to reproduce or a proof of concept
- The affected component (backend, admin portal, public form)
- Any potential impact you've identified

### What to Expect

- **Acknowledgement** within 3 business days
- **Status update** within 10 business days
- We will work with you to understand and resolve the issue before any public disclosure

### Scope

This policy covers the application code in this repository. For infrastructure or hosting issues related to Hubble or Meteor cafes, please contact pim@hubble.cafe directly.

## Security Best Practices for Contributors

- Never commit secrets, API keys, or credentials
- Never commit `.env` files
- Validate all user input at system boundaries
- Use parameterized queries (JPA handles this by default)
- Follow the principle of least privilege for API endpoints