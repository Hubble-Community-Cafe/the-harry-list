import type { APIRequestContext } from '@playwright/test';
import { BACKEND_URL } from '../playwright.config';

/**
 * Helpers for the backend's e2e-only /test endpoints (see TestSupportController).
 * These seed and reset state directly, so specs start from a known baseline without
 * going through Azure-authenticated admin APIs.
 */

/** Wipe mutable state (reservations, blocked periods, constraints, audit, users). */
export async function resetBackend(request: APIRequestContext): Promise<void> {
  const res = await request.post(`${BACKEND_URL}/test/reset`);
  if (!res.ok()) throw new Error(`/test/reset failed: ${res.status()}`);
}

export type AdminRole = 'VIEWER' | 'EDITOR' | 'ADMIN';

/** Create/update an admin user with a given role, for RBAC scenarios. */
export async function seedUser(
  request: APIRequestContext,
  user: { oid: string; email?: string; name?: string; role: AdminRole }
): Promise<void> {
  const res = await request.post(`${BACKEND_URL}/test/users`, { data: user });
  if (!res.ok()) throw new Error(`/test/users failed: ${res.status()}`);
}

export interface SeedBlockedPeriod {
  location?: string | null;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  reason: string;
  publicMessage?: string;
  softBlock?: boolean;
  acknowledgementText?: string;
  enabled?: boolean;
}

/** Seed a blocked period (hard or soft) for public-form scenarios. */
export async function seedBlockedPeriod(
  request: APIRequestContext,
  period: SeedBlockedPeriod
): Promise<void> {
  const res = await request.post(`${BACKEND_URL}/test/blocked-periods`, {
    data: { enabled: true, ...period },
  });
  if (!res.ok()) throw new Error(`/test/blocked-periods failed: ${res.status()}`);
}
