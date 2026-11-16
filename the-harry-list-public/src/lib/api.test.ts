import { describe, it, expect, vi, afterEach } from 'vitest';
import { submitReservation } from './api';
import type { ReservationFormData } from '../types/reservation';

const form = { specialActivities: [] } as unknown as ReservationFormData;

function respond(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/problem+json' } }),
  ));
}

describe('submitReservation errors', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the reason from the backend problem response', async () => {
    respond(400, { title: 'Bad Request', status: 400, detail: 'Hubble is closed on this date' });
    await expect(submitReservation(form)).rejects.toThrow('Hubble is closed on this date');
  });

  it('shows the first validation error', async () => {
    respond(400, {
      status: 400,
      detail: 'invoiceType: Please select an invoice type',
      errors: [{ field: 'invoiceType', message: 'Please select an invoice type' }],
    });
    await expect(submitReservation(form)).rejects.toThrow('invoiceType: Please select an invoice type');
  });

  it('falls back to a generic message when the body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 })));
    await expect(submitReservation(form)).rejects.toThrow('Failed to submit reservation');
  });
});
