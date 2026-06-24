import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installTranslationCrashGuard } from '../lib/translationCrashGuard';

describe('installTranslationCrashGuard', () => {
  const originalRemoveChild = Node.prototype.removeChild;
  const originalInsertBefore = Node.prototype.insertBefore;

  beforeEach(() => {
    installTranslationCrashGuard();
  });

  afterEach(() => {
    // Restore globals so the patch doesn't leak into other suites.
    Node.prototype.removeChild = originalRemoveChild;
    Node.prototype.insertBefore = originalInsertBefore;
  });

  it('still removes a genuine child node', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);

    expect(parent.removeChild(child)).toBe(child);
    expect(parent.childNodes.length).toBe(0);
  });

  it('does not throw when removing a node that was reparented away', () => {
    const parent = document.createElement('div');
    const orphan = document.createElement('span'); // never appended to parent

    expect(() => parent.removeChild(orphan)).not.toThrow();
    expect(parent.removeChild(orphan)).toBe(orphan);
  });

  it('still inserts before a genuine reference node', () => {
    const parent = document.createElement('div');
    const ref = document.createElement('span');
    const inserted = document.createElement('b');
    parent.appendChild(ref);

    parent.insertBefore(inserted, ref);
    expect(parent.firstChild).toBe(inserted);
  });

  it('does not throw when the reference node has a different parent', () => {
    const parent = document.createElement('div');
    const inserted = document.createElement('b');
    const foreignRef = document.createElement('span');
    document.createElement('div').appendChild(foreignRef);

    expect(() => parent.insertBefore(inserted, foreignRef)).not.toThrow();
    expect(parent.insertBefore(inserted, foreignRef)).toBe(inserted);
  });

  it('appends when the reference node is null', () => {
    const parent = document.createElement('div');
    const inserted = document.createElement('b');

    expect(() => parent.insertBefore(inserted, null)).not.toThrow();
    expect(parent.firstChild).toBe(inserted);
  });
});
