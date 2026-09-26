import { test, expect } from '@playwright/test';
import { resetBackend, seedUser, seedReservation, adminAuthHeaders } from '../../fixtures/backend';
import { BACKEND_URL } from '../../playwright.config';
import { attachJson } from '../../fixtures/evidence';

/**
 * RBAC is ultimately enforced by the backend (@PreAuthorize and the staff-group check), so we
 * assert it there: a VIEWER may read but not mutate, an EDITOR may mutate, and a tenant member
 * outside the staff group gets nothing. This guards the real security boundary regardless of any
 * UI button-hiding.
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

  test('a VIEWER can read but not edit or delete reservations; an EDITOR can', async ({ request }, testInfo) => {
    // /api/reservations used to require only a login, so a VIEWER could edit or delete any
    // reservation straight through the API even though the admin UI hid those buttons.
    const seeded = await seedReservation(request, {
      contactName: 'RBAC Guest',
      email: 'rbac.guest@example.com',
      eventTitle: 'RBAC Probe Booking',
      description: 'Probe for reservation role checks',
      eventDate: '2031-02-14',
      startTime: '16:00',
      endTime: '18:00',
      expectedGuests: 12,
      location: 'HUBBLE',
      seatingArea: 'INSIDE',
      paymentOption: 'INDIVIDUAL',
      status: 'PENDING',
    });
    const url = `${BACKEND_URL}/api/reservations/${seeded.id}`;

    const viewerRead = await request.get(url, { headers: adminAuthHeaders('e2e-viewer') });
    const current = await viewerRead.json();
    const edited = { ...current, eventTitle: 'RBAC Probe Booking (edited)' };

    const viewerUpdate = await request.put(`${url}?sendEmail=false`, {
      headers: adminAuthHeaders('e2e-viewer'),
      data: edited,
    });
    const viewerDelete = await request.delete(`${url}?sendEmail=false`, {
      headers: adminAuthHeaders('e2e-viewer'),
    });
    const editorUpdate = await request.put(`${url}?sendEmail=false`, {
      headers: adminAuthHeaders('e2e-editor'),
      data: edited,
    });
    const editorUpdateBody = await editorUpdate.text();
    const editorDelete = await request.delete(`${url}?sendEmail=false`, {
      headers: adminAuthHeaders('e2e-editor'),
    });

    await attachJson(testInfo, 'rbac-reservation-results.json', {
      viewerRead: viewerRead.status(),
      viewerUpdate: viewerUpdate.status(),
      viewerDelete: viewerDelete.status(),
      editorUpdate: editorUpdate.status(),
      editorUpdateBody,
      editorDelete: editorDelete.status(),
    });

    expect(viewerRead.status()).toBe(200); // viewers can see reservations
    expect(viewerUpdate.status()).toBe(403); // but not change them
    expect(viewerDelete.status()).toBe(403); // or remove them
    expect(editorUpdate.status(), `editor update response: ${editorUpdateBody}`).toBe(200);
    expect(editorDelete.status()).toBe(204);
  });

  test('a tenant member outside the staff group is refused and never provisioned', async ({ request }, testInfo) => {
    // The e2e backend runs with ALLOWED_GROUP_ID=e2e-staff-group, and the header login puts that
    // group in the token by default. X-Test-Groups impersonates someone outside the staff group.
    await seedUser(request, { oid: 'e2e-admin', role: 'ADMIN' });
    const outsider = { ...adminAuthHeaders('e2e-outsider'), 'X-Test-Groups': 'some-other-group' };

    const outsiderMe = await request.get(`${BACKEND_URL}/api/admin/users/me`, { headers: outsider });
    const outsiderList = await request.get(`${BACKEND_URL}/api/reservations`, { headers: outsider });
    const staffList = await request.get(`${BACKEND_URL}/api/reservations`, {
      headers: adminAuthHeaders('e2e-viewer'),
    });
    const users = await request.get(`${BACKEND_URL}/api/admin/users`, { headers: adminAuthHeaders('e2e-admin') });
    const userOids: string[] = (await users.json()).map((u: { azureOid: string }) => u.azureOid);

    await attachJson(testInfo, 'rbac-group-results.json', {
      outsiderMe: outsiderMe.status(),
      outsiderList: outsiderList.status(),
      staffList: staffList.status(),
      userOids,
    });

    expect(outsiderMe.status()).toBe(403);
    expect(outsiderList.status()).toBe(403);
    expect(staffList.status()).toBe(200); // staff group members are unaffected
    expect(userOids).not.toContain('e2e-outsider'); // no admin_user row was created
  });

  test('an EDITOR can manage catering email PDF attachments; a VIEWER cannot', async ({ request }, testInfo) => {
    const upload = (oid: string) =>
      request.post(`${BACKEND_URL}/api/admin/email-attachments`, {
        headers: adminAuthHeaders(oid),
        multipart: {
          name: 'RBAC Catering Menu',
          file: { name: 'menu.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 rbac probe') },
        },
      });

    const viewerUpload = await upload('e2e-viewer');
    const editorUpload = await upload('e2e-editor');
    const editorUploadBody = await editorUpload.text();

    await attachJson(testInfo, 'rbac-attachment-results.json', {
      viewerUpload: viewerUpload.status(),
      editorUpload: editorUpload.status(),
      editorUploadBody,
    });

    expect(viewerUpload.status()).toBe(403); // viewers cannot upload attachments
    expect(editorUpload.status(), `editor upload response: ${editorUploadBody}`).toBe(200); // editors can
  });
});
