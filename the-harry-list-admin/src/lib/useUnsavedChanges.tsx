import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useBlocker } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface UnsavedChanges {
  /** Run `action` (closing a dialog, switching items) at once, or after the user agrees to discard. */
  confirmDiscard: (action: () => void) => void;
  /** Render this once on the page: the "Discard unsaved changes?" question. */
  unsavedChangesDialog: ReactNode;
}

/**
 * Protects unsaved input on an admin page. While `isDirty` is true:
 * - leaving the page (sidebar, links, browser back/forward) first asks to discard the changes;
 * - closing or reloading the tab triggers the browser's own "leave site?" warning;
 * - `confirmDiscard` asks the same question before an in-page action that would drop the input.
 * Pages pass `isDirty` only when the input differs from what it was when editing started, so
 * merely opening a form never triggers a warning.
 */
export function useUnsavedChanges(isDirty: boolean): UnsavedChanges {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search),
  );
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers only show the prompt when returnValue is set.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const confirmDiscard = useCallback(
    (action: () => void) => {
      if (isDirty) setPendingAction(() => action);
      else action();
    },
    [isDirty],
  );

  const open = blocker.state === 'blocked' || pendingAction !== null;
  const discard = () => {
    if (blocker.state === 'blocked') blocker.proceed();
    pendingAction?.();
    setPendingAction(null);
  };
  const keepEditing = () => {
    if (blocker.state === 'blocked') blocker.reset();
    setPendingAction(null);
  };

  const unsavedChangesDialog = (
    <ConfirmDialog
      open={open}
      title="Discard unsaved changes?"
      message="You have changes that are not saved yet. If you continue, they are lost."
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      onConfirm={discard}
      onCancel={keepEditing}
    />
  );

  return { confirmDiscard, unsavedChangesDialog };
}
