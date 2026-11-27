import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

const { mockCaptureException } = vi.hoisted(() => ({ mockCaptureException: vi.fn() }));

vi.mock('@sentry/react', () => ({ captureException: mockCaptureException }));

// Sign in through the e2e header bridge so no MSAL instance is needed.
vi.mock('../lib/e2eAuth', () => ({
  getE2eAuth: () => ({ oid: 'oid-1' }),
  isE2E: () => true,
}));

type Api = typeof import('../lib/api');
let api: Api;

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/problem+json' } });

describe('fetchCurrentUser 403 handling', () => {
  beforeAll(async () => {
    window.__RUNTIME_CONFIG__ = { API_URL: 'https://api.test' };
    api = await import('../lib/api');
  });

  beforeEach(() => {
    mockCaptureException.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws NotInStaffGroupError, without a Sentry report, when the backend refuses the staff group', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(403, {
      title: 'Forbidden', status: 403, code: 'NOT_IN_STAFF_GROUP',
    })));

    await expect(api.fetchCurrentUser()).rejects.toBeInstanceOf(api.NotInStaffGroupError);
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('keeps a plain ForbiddenError, reported to Sentry, for any other 403', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(403, { title: 'Forbidden', status: 403 })));

    const error = await api.fetchCurrentUser().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(api.ForbiddenError);
    expect(error).not.toBeInstanceOf(api.NotInStaffGroupError);
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
  });
});
