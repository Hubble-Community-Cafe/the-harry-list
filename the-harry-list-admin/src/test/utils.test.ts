import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('utils', () => {
  describe('cn (classnames utility)', () => {
    it('merges class names correctly', () => {
      const result = cn('foo', 'bar');
      expect(result).toBe('foo bar');
    });

    it('handles conditional classes', () => {
      const isActive = true;
      const result = cn('base', isActive && 'active');
      expect(result).toContain('base');
      expect(result).toContain('active');
    });

    it('filters out falsy values', () => {
      const result = cn('base', false && 'hidden', null, undefined, 'visible');
      expect(result).toBe('base visible');
    });

    it('merges Tailwind classes correctly', () => {
      const result = cn('p-4', 'p-2');
      expect(result).toBe('p-2');
    });

    it('handles empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });
  });
});

