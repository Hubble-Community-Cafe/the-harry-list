import type { AccountInfo } from '@azure/msal-browser';

/**
 * The user Sentry attaches to error reports: the Entra object id only, never the email
 * address or name, so reports stay pseudonymous but can still be grouped per staff member.
 */
export function sentryUserFor(account: AccountInfo | null | undefined): { id: string } | null {
  if (!account?.localAccountId) return null;
  return { id: account.localAccountId };
}
