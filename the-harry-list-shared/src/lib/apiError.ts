/**
 * Readable message from an API error body. The backend answers every error as an RFC 9457
 * problem response (`detail`, plus `errors: [{ field, message }]` for validation); older or
 * proxy responses may still carry `message` or `error`. Anything else falls back.
 */
export function apiErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const data = body as Record<string, unknown>;
    for (const key of ['detail', 'message', 'error'] as const) {
      const value = data[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
    if (Array.isArray(data.errors)) {
      const messages = data.errors
        .map((e) => (e && typeof e === 'object' ? (e as { message?: unknown; defaultMessage?: unknown }) : {}))
        .map((e) => (typeof e.message === 'string' ? e.message : typeof e.defaultMessage === 'string' ? e.defaultMessage : ''))
        .filter(Boolean);
      if (messages.length) return messages.join(', ');
    }
  }
  return fallback;
}
