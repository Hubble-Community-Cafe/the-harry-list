import { describe, it, expect } from 'vitest';
import type { AccountInfo } from '@azure/msal-browser';
import { sentryUserFor } from '../lib/sentryUser';

const account = {
  homeAccountId: 'home-id',
  environment: 'login.microsoftonline.com',
  tenantId: 'tenant-id',
  username: 'staff.member@example.com',
  localAccountId: '00000000-1111-2222-3333-444444444444',
  name: 'Staff Member',
} as AccountInfo;

describe('sentryUserFor', () => {
  it('identifies the user by Entra object id only', () => {
    expect(sentryUserFor(account)).toEqual({ id: '00000000-1111-2222-3333-444444444444' });
  });

  it('never includes the email address or name', () => {
    const json = JSON.stringify(sentryUserFor(account));
    expect(json).not.toContain('staff.member@example.com');
    expect(json).not.toContain('Staff Member');
  });

  it('returns null without an account', () => {
    expect(sentryUserFor(null)).toBeNull();
    expect(sentryUserFor(undefined)).toBeNull();
  });
});
