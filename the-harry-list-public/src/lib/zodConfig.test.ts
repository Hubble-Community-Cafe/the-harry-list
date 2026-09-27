import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import './zodConfig';

describe('zodConfig', () => {
  it('turns off the JIT so Zod never calls new Function under the CSP', () => {
    expect(z.config().jitless).toBe(true);
  });
});
