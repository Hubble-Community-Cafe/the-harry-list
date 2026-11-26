import { useId, useRef } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { Modal } from 'the-harry-list-shared';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  /** data-testid for the confirm button, for end-to-end tests. */
  confirmTestId?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  loading = false,
  confirmTestId,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const id = useId();
  // Focus starts on the safe answer, so a stray Enter never confirms a delete.
  const cancelRef = useRef<HTMLButtonElement>(null);
  if (!open) return null;

  return (
    <Modal
      role="alertdialog"
      labelledBy={`${id}-title`}
      describedBy={`${id}-message`}
      // While the action runs, the question stays open: Escape does nothing.
      onClose={loading ? () => {} : onCancel}
      initialFocusRef={cancelRef}
      overlayClassName="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 animate-overlay"
      className="bg-dark-900 border border-dark-700 rounded-xl w-full max-w-sm animate-modal"
    >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 id={`${id}-title`} className="text-white font-semibold">{title}</h2>
              <p id={`${id}-message`} className="text-sm text-dark-400 mt-1">{message}</p>
            </div>
            <button onClick={onCancel} aria-label="Close" className="text-dark-400 hover:text-white shrink-0" disabled={loading}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              ref={cancelRef}
              onClick={onCancel}
              disabled={loading}
              className="btn-neutral btn-sm"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              data-testid={confirmTestId}
              disabled={loading}
              className="btn-danger btn-sm gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
    </Modal>
  );
}
