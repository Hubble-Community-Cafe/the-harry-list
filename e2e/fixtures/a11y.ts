import { expect, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { attachJson } from './evidence';

/** WCAG 2.2 level A and AA, which includes every 2.0 and 2.1 A/AA rule. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export type Theme = 'light' | 'dark';
export const THEMES: Theme[] = ['light', 'dark'];

/** Start every page of this test in the given theme (ThemeContext reads it from localStorage). */
export async function useTheme(page: Page, theme: Theme): Promise<void> {
  await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
}

/**
 * Runs axe on the current, settled page state and fails the test on any WCAG 2.2 A/AA violation.
 * The failure lists each rule with its impact and the first affected elements, and the full result
 * is attached to the report, so a regression can be fixed without re-running the suite.
 */
export async function expectNoA11yViolations(page: Page, testInfo: TestInfo, label: string): Promise<void> {
  // Scan the settled page: the form steps fade in, and text measured mid-animation reports a lower
  // contrast than the user ends up seeing.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  await attachJson(testInfo, `axe-${label.replace(/[^a-z0-9]+/gi, '-')}.json`, results.violations);

  const summary = results.violations.map((v) => {
    const targets = v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ');
    return `${v.id} [${v.impact}] ${v.help}: ${v.nodes.length} element(s), e.g. ${targets}`;
  });
  // Soft: a test that scans several pages reports every page's violations in one run.
  expect.soft(summary, `accessibility violations on "${label}"`).toEqual([]);
}
