import { describe, it, expect } from 'vitest';

// Every source file (components, pages, help text, labels), as text.
const sources = import.meta.glob(['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!../test/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const EM_DASH = '—';

describe('housestyle copy', () => {
  it('finds sources to check', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(5);
  });

  it('uses no em dashes (a colon, comma, parentheses or "to" instead)', () => {
    const found = Object.entries(sources).flatMap(([file, text]) =>
      text.split('\n').flatMap((line, i) => (line.includes(EM_DASH) ? [`${file}:${i + 1}`] : [])),
    );
    expect(found).toEqual([]);
  });
});
