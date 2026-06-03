import { describe, it, expect, afterEach } from 'vitest';
import { getE2eAuth, isE2E } from '../lib/e2eAuth';

/**
 * The e2e auth bridge must be completely inert unless an E2E_AUTH_OID runtime value
 * is injected (only docker-compose.e2e.yml does this). These tests guard that gate.
 */
describe('e2eAuth', () => {
  afterEach(() => {
    delete (window as { __RUNTIME_CONFIG__?: unknown }).__RUNTIME_CONFIG__;
  });

  it('is inert when no runtime config is present', () => {
    expect(getE2eAuth()).toBeNull();
    expect(isE2E()).toBe(false);
  });

  it('is inert when the oid is an unsubstituted placeholder', () => {
    window.__RUNTIME_CONFIG__ = { E2E_AUTH_OID: '__E2E_AUTH_OID__' };
    expect(isE2E()).toBe(false);
  });

  it('is inert when the oid is empty', () => {
    window.__RUNTIME_CONFIG__ = { E2E_AUTH_OID: '' };
    expect(isE2E()).toBe(false);
  });

  it('activates and returns the identity when an oid is injected', () => {
    window.__RUNTIME_CONFIG__ = {
      E2E_AUTH_OID: 'e2e-admin',
      E2E_AUTH_EMAIL: 'admin@e2e.test',
      E2E_AUTH_NAME: 'E2E Admin',
    };
    expect(isE2E()).toBe(true);
    expect(getE2eAuth()).toEqual({ oid: 'e2e-admin', email: 'admin@e2e.test', name: 'E2E Admin' });
  });

  it('omits optional fields when they are blank or placeholders', () => {
    window.__RUNTIME_CONFIG__ = {
      E2E_AUTH_OID: 'e2e-admin',
      E2E_AUTH_EMAIL: '',
      E2E_AUTH_NAME: '__E2E_AUTH_NAME__',
    };
    expect(getE2eAuth()).toEqual({ oid: 'e2e-admin', email: undefined, name: undefined });
  });
});
