import { useEffect, useRef, type ReactNode, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
  'select:not([disabled]), textarea:not([disabled]), iframe, [contenteditable="true"], ' +
  '[tabindex]:not([tabindex="-1"])';

/** Open modals, innermost last: only the top one answers Escape and keeps Tab inside. */
const openModals: HTMLElement[] = [];

function focusableIn(panel: HTMLElement): HTMLElement[] {
  // Skip anything hidden. checkVisibility() is in every current browser; where it is missing
  // (jsdom in unit tests) treat the element as visible.
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      !el.closest('[hidden], [inert]') &&
      (typeof el.checkVisibility !== 'function' || el.checkVisibility()),
  );
}

interface ModalProps {
  /** Escape, the backdrop (when closeOnBackdrop) and any close button call this. */
  onClose: () => void;
  /** Id of the element that names the dialog, usually its heading. */
  labelledBy: string;
  /** Id of the element that describes the dialog, if any. */
  describedBy?: string;
  /** 'alertdialog' for a question that needs an answer (confirm, acknowledge). */
  role?: 'dialog' | 'alertdialog';
  /** Close when the dimmed backdrop is clicked. */
  closeOnBackdrop?: boolean;
  /** Element to focus on open; defaults to the first focusable element in the dialog. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Classes for the dialog panel (size, surface, padding). */
  className: string;
  /** Classes for the full-screen backdrop. */
  overlayClassName?: string;
  testId?: string;
  backdropTestId?: string;
  children: ReactNode;
}

/**
 * An accessible modal dialog (WCAG 2.1.2, 2.4.3, 4.1.2): announced as a dialog and named by
 * its heading, focus moves in on open, Tab and Shift+Tab stay inside, Escape closes it, and
 * focus returns to whatever opened it. Render it only while the dialog is open.
 */
export function Modal({
  onClose,
  labelledBy,
  describedBy,
  role = 'dialog',
  closeOnBackdrop = false,
  initialFocusRef,
  className,
  overlayClassName = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-overlay',
  testId,
  backdropTestId,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const opener = document.activeElement as HTMLElement | null;
    openModals.push(panel);

    const first = initialFocusRef?.current ?? focusableIn(panel)[0] ?? panel;
    first.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (openModals[openModals.length - 1] !== panel) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusableIn(panel);
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === firstItem || !panel.contains(active))) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && (active === lastItem || !panel.contains(active))) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      openModals.splice(openModals.indexOf(panel), 1);
      // Back to the opener, unless it is gone (for example a button inside a dialog that closed too).
      if (opener?.isConnected) opener.focus();
    };
    // Runs once per opening; the latest onClose is read through the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={overlayClassName}
      data-testid={backdropTestId}
      onClick={closeOnBackdrop ? (event) => { if (event.target === event.currentTarget) onClose(); } : undefined}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        data-testid={testId}
        className={`${className} outline-none`}
      >
        {children}
      </div>
    </div>
  );
}
