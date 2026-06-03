import { test, expect } from '@playwright/test';
import { resetBackend, seedUser, adminAuthHeaders } from '../../fixtures/backend';
import { attachJson } from '../../fixtures/evidence';
import { BACKEND_URL } from '../../playwright.config';

/**
 * Audit log (backward-compatibility feature): an admin mutation is recorded in the audit
 * log. We create a blocked period, then read the audit log and assert the entry is there.
 */
test.describe('admin: actions are recorded in the audit log', () => {
  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedUser(request, { oid: 'e2e-admin', role: 'ADMIN' });
  });

  test('creating a blocked period produces an audit entry', async ({ request }, testInfo) => {
    const create = await request.post(`${BACKEND_URL}/api/admin/blocked-periods`, {
      headers: adminAuthHeaders('e2e-admin'),
      data: {
        startDate: '2031-03-01',
        endDate: '2031-03-02',
        reason: 'Audited closure',
        softBlock: false,
        enabled: true,
      },
    });
    expect(create.status()).toBe(201);

    const audit = await request.get(`${BACKEND_URL}/api/admin/audit`, {
      headers: adminAuthHeaders('e2e-admin'),
    });
    expect(audit.ok()).toBeTruthy();

    const body = await audit.text();
    await attachJson(testInfo, 'audit-response.json', JSON.parse(body));
    // The audit entry references the blocked-period entity type.
    expect(body).toContain('BLOCKED_PERIOD');
  });
});
