import { describe, it, expect } from 'vitest';

// Every component and page source, as text.
const sources = import.meta.glob(['../**/*.tsx', '!../**/*.test.tsx', '!../test/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Raw Tailwind palette colours: the housestyle uses its own tokens (status, notice, hubble, meteor, dark). */
const RAW_COLOUR = /\b(?:[a-z]+:)*(?:text|bg|border|border-[lrtb]|ring|fill|stroke|from|to)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;

describe('housestyle colours', () => {
  it('finds sources to check', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(5);
  });

  it('uses no raw Tailwind palette colours', () => {
    const found = Object.entries(sources).flatMap(([file, text]) =>
      (text.match(RAW_COLOUR) ?? []).map((cls) => `${file}: ${cls}`),
    );
    expect(found).toEqual([]);
  });
});
