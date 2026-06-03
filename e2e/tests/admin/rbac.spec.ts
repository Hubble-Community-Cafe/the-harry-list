import { test, expect } from '@playwright/test';
import { resetBackend, seedUser, adminAuthHeaders } from '../../fixtures/backend';
import { BACKEND_URL } from '../../playwright.config';
import { attachJson } from '../../fixtures/evidence';

/**
 * RBAC is ultimately enforced by the backend (@PreAuthorize), so we assert it there:
 * a VIEWER may read but not mutate, an EDITOR may mutate. This guards the real security
 * boundary regardless of any UI button-hiding.
 */
test.describe('admin: RBAC is enforced by the backend', () => {
  const newPeriod = {
    startDate: '2031-01-01',
    endDate: '2031-01-02',
    reason: 'rbac probe',
    softBlock: false,
    enabled: true,
  };

  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedUser(request, { oid: 'e2e-viewer', role: 'VIEWER' });
    await seedUser(request, { oid: 'e2e-editor', role: 'EDITOR' });
  });

  test('a VIEWER can read but not mutate; an EDITOR can mutate', async ({ request }, testInfo) => {
    const viewerRead = await request.get(`${BACKEND_URL}/api/admin/blocked-periods`, {
      headers: adminAuthHeaders('e2e-viewer'),
    });
    const viewerWrite = await request.post(`${BACKEND_URL}/api/admin/blocked-periods`, {
      headers: adminAuthHeaders('e2e-viewer'),
      data: newPeriod,
    });
    const editorWrite = await request.post(`${BACKEND_URL}/api/admin/blocked-periods`, {
      headers: adminAuthHeaders('e2e-editor'),
      data: newPeriod,
    });

    const editorWriteBody = await editorWrite.text();
    await attachJson(testInfo, 'rbac-results.json', {
      viewerRead: viewerRead.status(),
      viewerWrite: viewerWrite.status(),
      editorWrite: editorWrite.status(),
      editorWriteBody,
    });

    expect(viewerRead.status()).toBe(200); // reads are allowed
    expect(viewerWrite.status()).toBe(403); // viewers cannot mutate
    expect(editorWrite.status(), `editor create response: ${editorWriteBody}`).toBe(201); // editors can
  });
});
