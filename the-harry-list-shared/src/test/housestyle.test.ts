import { describe, it, expect } from 'vitest';

/**
 * The café housestyle retired a "tech" look: gradient text, glowing gradient buttons, blurred
 * blobs and frosted glass. This guard fails when any of it comes back in either app.
 *
 * Sources are read as text through Vite (like the apps' housestyle guards), not node:fs, so the
 * test typechecks with the browser tsconfig.
 */
const sources = import.meta.glob(
  [
    '../../../the-harry-list-public/src/**/*.{ts,tsx,css}',
    '../../../the-harry-list-admin/src/**/*.{ts,tsx,css}',
    '../**/*.{ts,tsx,css}',
    '../../styles.css',
    '!../../../the-harry-list-*/src/**/*.test.{ts,tsx}',
    '!../**/*.test.{ts,tsx}',
  ],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const RETIRED: [RegExp, string][] = [
  [/\bbg-clip-text\b/, 'gradient text (bg-clip-text)'],
  [/\bbg-gradient-to-/, 'gradient background'],
  [/\bbackdrop-blur/, 'frosted glass (backdrop-blur)'],
  [/\bblur-(?:2xl|3xl)\b/, 'blurred blob'],
  [/\bshadow-(?:hubble|meteor|green)-\d+\/\d+/, 'coloured glow shadow'],
];

describe('housestyle', () => {
  it('reads the sources of both apps and the shared package', () => {
    const paths = Object.keys(sources);
    expect(paths.some((p) => p.includes('the-harry-list-public/src/'))).toBe(true);
    expect(paths.some((p) => p.includes('the-harry-list-admin/src/'))).toBe(true);
    expect(paths).toContain('../../styles.css');
  });

  it('uses none of the retired effects', () => {
    const hits: string[] = [];
    for (const [file, text] of Object.entries(sources)) {
      text.split('\n').forEach((line, i) => {
        // Comments may name the retired effects to explain their absence.
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        for (const [pattern, what] of RETIRED) {
          if (pattern.test(line)) hits.push(`${file}:${i + 1} ${what}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });
});
