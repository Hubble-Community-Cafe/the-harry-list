import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from '../lib/api';

describe('fetchWithRetry', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('returns immediately on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));

    const response = await fetchWithRetry('https://example.com/api');

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 503 and succeeds on second attempt', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const promise = fetchWithRetry('https://example.com/api');
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('retries on network error and succeeds on second attempt', async () => {
    globalThis.fetch = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const promise = fetchWithRetry('https://example.com/api');
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('throws after max attempts on persistent network error', async () => {
    vi.useRealTimers();
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.reject(new TypeError('Failed to fetch'));
    });

    // Use maxAttempts=1 to avoid real delays
    await expect(fetchWithRetry('https://example.com/api', 1)).rejects.toThrow('Failed to fetch');
    expect(callCount).toBe(1);
    vi.useFakeTimers();
  });

  it('returns last response after max attempts on persistent 503', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 }));

    const promise = fetchWithRetry('https://example.com/api', 3);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    const response = await promise;

    expect(response.status).toBe(503);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('does not retry on 400 (non-retryable)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('bad request', { status: 400 }));

    const response = await fetchWithRetry('https://example.com/api');

    expect(response.status).toBe(400);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not retry on 404 (non-retryable)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('not found', { status: 404 }));

    const response = await fetchWithRetry('https://example.com/api');

    expect(response.status).toBe(404);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 (rate limited)', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const promise = fetchWithRetry('https://example.com/api');
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('uses exponential backoff (1s, 2s)', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(new Response('error', { status: 502 }))
      .mockResolvedValueOnce(new Response('error', { status: 502 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const promise = fetchWithRetry('https://example.com/api', 3);

    // After 999ms, second attempt should not have fired yet
    await vi.advanceTimersByTimeAsync(999);
    expect(fetch).toHaveBeenCalledTimes(1);

    // At 1000ms, second attempt fires
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(2);

    // After another 2000ms, third attempt fires
    await vi.advanceTimersByTimeAsync(2000);
    const response = await promise;

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});