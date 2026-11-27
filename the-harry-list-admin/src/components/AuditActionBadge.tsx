const TONES = {
  green: 'status-confirmed',
  peach: 'status-pending',
  red: 'status-rejected',
  tan: 'status-cancelled',
  teal: 'bg-hubble-500/20 text-hubble-400',
  meteor: 'bg-meteor-500/20 text-meteor-400',
};

const ACTIONS: Record<string, { label: string; tone: keyof typeof TONES }> = {
  CREATE: { label: 'Created', tone: 'green' },
  UPDATE: { label: 'Updated', tone: 'teal' },
  DELETE: { label: 'Deleted', tone: 'red' },
  STATUS_CHANGE: { label: 'Status changed', tone: 'peach' },
  NOTES_UPDATED: { label: 'Notes updated', tone: 'teal' },
  CATERING_ARRANGED: { label: 'Catering', tone: 'peach' },
  EMAIL_SENT: { label: 'Email sent', tone: 'meteor' },
  ROLE_CHANGED: { label: 'Role changed', tone: 'red' },
  TOGGLE: { label: 'Toggled', tone: 'tan' },
};

/**
 * What an audit log entry did, as a word on a housestyle tint (the shared --status-* tokens plus
 * Hubble teal and Meteor green). The word carries the meaning, so colour is never the only cue.
 */
export function AuditActionBadge({ action }: { action: string }) {
  const known = ACTIONS[action];
  const className = known ? TONES[known.tone] : 'bg-dark-700 text-dark-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {known?.label ?? action}
    </span>
  );
}
