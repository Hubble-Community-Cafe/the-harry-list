import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * The café housestyle retired a "tech" look: gradient text, glowing gradient buttons, blurred
 * blobs and frosted glass. This guard fails when any of it comes back in either app.
 */
const ROOT = join(__dirname, '..', '..', '..');
const SOURCES = ['the-harry-list-public/src', 'the-harry-list-admin/src', 'the-harry-list-shared/src', 'the-harry-list-shared/styles.css'];
const RETIRED: [RegExp, string][] = [
  [/\bbg-clip-text\b/, 'gradient text (bg-clip-text)'],
  [/\bbg-gradient-to-/, 'gradient background'],
  [/\bbackdrop-blur/, 'frosted glass (backdrop-blur)'],
  [/\bblur-(?:2xl|3xl)\b/, 'blurred blob'],
  [/\bshadow-(?:hubble|meteor|green)-\d+\/\d+/, 'coloured glow shadow'],
];

function files(path: string): string[] {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path).flatMap((name) => files(join(path, name)));
}

describe('housestyle', () => {
  it('uses none of the retired effects', () => {
    const hits: string[] = [];
    for (const file of SOURCES.flatMap((s) => files(join(ROOT, s)))) {
      if (!/\.(tsx?|css)$/.test(file) || /\.test\.tsx?$/.test(file)) continue;
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        // Comments may name the retired effects to explain their absence.
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        for (const [pattern, what] of RETIRED) {
          if (pattern.test(line)) hits.push(`${relative(ROOT, file)}:${i + 1} ${what}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });
});
