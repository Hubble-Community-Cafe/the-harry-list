import { expect, type Page, type Response, type TestInfo } from '@playwright/test';
import { attachJson } from './evidence';

export interface CspViolation {
  directive: string;
  blockedURI: string;
  source?: string;
}

/**
 * Records every Content-Security-Policy violation the browser reports, across all navigations of
 * this page. Call before the first navigation. Each violation is sent straight back to the test
 * process, so a full page load cannot discard earlier ones. Console errors mentioning the CSP are
 * captured too, since a blocked worker or style can surface there first.
 */
export async function watchCspViolations(page: Page): Promise<() => CspViolation[]> {
  const found: CspViolation[] = [];
  page.on('console', (msg) => {
    if (/Content Security Policy/i.test(msg.text())) {
      found.push({ directive: 'console', blockedURI: msg.text() });
    }
  });
  await page.exposeBinding('__reportCspViolation', (_source, violation: CspViolation) => {
    found.push(violation);
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __reportCspViolation: (v: unknown) => void }).__reportCspViolation({
        directive: e.effectiveDirective,
        blockedURI: e.blockedURI,
        source: e.sourceFile ? `${e.sourceFile}:${e.lineNumber}` : undefined,
      });
    });
  });
  return () => [...found];
}

/** The document response carries an enforcing CSP (not Report-Only) with the given directives. */
export function expectEnforcingCsp(response: Response | null, ...directives: string[]): void {
  expect(response, 'document response').not.toBeNull();
  const headers = response!.headers();
  expect(headers['content-security-policy-report-only'], 'report-only header').toBeUndefined();
  const csp = headers['content-security-policy'];
  expect(csp, 'Content-Security-Policy header').toBeTruthy();
  for (const directive of directives) expect(csp).toContain(directive);
}

export async function expectNoCspViolations(
  violations: () => CspViolation[],
  testInfo: TestInfo,
): Promise<void> {
  const found = violations();
  await attachJson(testInfo, 'csp-violations.json', found);
  expect(found, 'CSP violations reported by the browser').toEqual([]);
}
