import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Close a popover/menu when the user clicks outside it or presses Escape.
 *
 * Listeners are only attached while `open` is true, so a closed menu costs nothing and cannot
 * swallow an Escape meant for something else.
 *
 * @param ref     wrapper element that counts as "inside" (the trigger and the menu)
 * @param open    whether the menu is currently open
 * @param onClose called once when an outside click or Escape happens
 */
export function useDismissOnOutside(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ref, open, onClose]);
}
