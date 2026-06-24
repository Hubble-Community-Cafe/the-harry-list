/**
 * Mitigates a React crash triggered by in-browser page translators
 * (Google Translate, Microsoft Translator, etc.). Those tools mutate and
 * reparent text nodes outside of React's control, so when React later commits
 * an update it can call `removeChild` / `insertBefore` against a node that has
 * already been moved.
 */
export function installTranslationCrashGuard(): void {
  if (typeof Node !== 'function' || !Node.prototype) return;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      if (import.meta.env.DEV) {
        console.warn('[translationCrashGuard] skipped removeChild of a reparented node', child, this);
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (import.meta.env.DEV) {
        console.warn('[translationCrashGuard] skipped insertBefore with a foreign reference node', referenceNode, this);
      }
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
