import { z } from 'zod';

/**
 * Validate without Zod's JIT. The JIT compiles validators with `new Function`, which the
 * Content-Security-Policy (script-src 'self', no 'unsafe-eval') blocks. Zod would fall back on its
 * own, but its capability probe still trips a CSP violation on every page load.
 *
 * Zod decides this when a schema is created, and ReservationForm creates its schema at module
 * level, so main.tsx must import this module before anything that defines a schema.
 */
z.config({ jitless: true });
