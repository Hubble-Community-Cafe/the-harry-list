import { describe, it, expect } from 'vitest';
import { configuredValue } from '../lib/runtimeConfig';

describe('configuredValue', () => {
  it('keeps a filled-in value', () => {
    expect(configuredValue('https://api.example.com')).toBe('https://api.example.com');
  });

  it('treats an unreplaced placeholder as missing', () => {
    expect(configuredValue('__API_URL__')).toBeUndefined();
  });

  it('treats empty, blank and absent values as missing', () => {
    expect(configuredValue('')).toBeUndefined();
    expect(configuredValue('   ')).toBeUndefined();
    expect(configuredValue(undefined)).toBeUndefined();
    expect(configuredValue(null)).toBeUndefined();
  });
});
