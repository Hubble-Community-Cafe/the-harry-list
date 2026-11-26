import { useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from 'the-harry-list-shared';

/*
 * Confirmation dialog for an ACTIVITY_NOTICE constraint that staff have marked as
 * requiring acknowledgement (targetValue = "CONFIRM"). It appears the moment the guest
 * selects the triggering activity, so an easily-missed banner becomes a deliberate choice.
 * A notice limited to a location or group size appears as soon as those also match, which
 * can be after the activity was already selected.
 *
 * The title is intentionally fixed ("Please Note") — only the message is configurable in
 * the admin Settings, which keeps every notice consistent.
 *
 * Dismissing without choosing (Escape, backdrop click) counts as "deselect": we never
 * silently accept a notice the guest has not actually acknowledged.
 */

interface ActivityNoticeDialogProps {
  /** The configured notice message, or null when no dialog is pending. */
  message: string | null;
  /** Guest acknowledged: keep the activity selected. */
  onConfirm: () => void;
  /** Guest declined or dismissed: deselect the activity again. */
  onDecline: () => void;
}

export function ActivityNoticeDialog({ message, onConfirm, onDecline }: ActivityNoticeDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  if (!message) return null;

  // Escape and the backdrop decline (the safe default); focus starts on the confirm button.
  return (
    <Modal
      role="alertdialog"
      labelledBy="activity-notice-title"
      describedBy="activity-notice-message"
      onClose={onDecline}
      closeOnBackdrop
      initialFocusRef={confirmRef}
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-overlay"
      backdropTestId="activity-notice-dialog-backdrop"
      testId="activity-notice-dialog"
      className="relative w-full max-w-md rounded-2xl border border-dark-700 bg-dark-900 p-6 shadow-2xl animate-modal"
    >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <h2 id="activity-notice-title" className="text-xl font-title font-semibold text-white tracking-tight">
            Please Note
          </h2>
        </div>

        <p id="activity-notice-message" className="text-sm text-dark-300 leading-relaxed mb-6">
          {message}
        </p>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onDecline}
            data-testid="activity-notice-decline"
            className="btn-neutral"
          >
            No, deselect this
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            data-testid="activity-notice-confirm"
            className="btn-primary"
          >
            Yes, I am aware
          </button>
        </div>
    </Modal>
  );
}
