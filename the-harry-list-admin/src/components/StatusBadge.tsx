import { Ban, CheckCircle, Clock, XCircle, type LucideIcon } from 'lucide-react';
import { statusLabel } from '../lib/labels';
import { STATUS_CLASS } from '../lib/status';

const STATUS_ICON: Record<string, LucideIcon> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle,
  REJECTED: XCircle,
  CANCELLED: Ban,
};

const SIZES = {
  /** Week overview cards: as small as it gets. */
  compact: { badge: 'gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold', icon: 'w-2.5 h-2.5' },
  /** Lists and the dashboard. */
  default: { badge: 'gap-1 px-2 py-1 rounded-lg text-xs font-medium', icon: 'w-3 h-3' },
  /** The reservation detail header. */
  large: { badge: 'gap-2 px-3 py-1.5 rounded-xl text-sm font-medium', icon: 'w-4 h-4' },
};

/**
 * A reservation's status: icon plus word, never colour alone (WCAG 1.4.1). The colours are the
 * shared --status-* tokens, so light and dark mode need no overrides.
 */
export function StatusBadge({
  status,
  size = 'default',
  testId,
}: {
  status: string;
  size?: keyof typeof SIZES;
  testId?: string;
}) {
  const className = STATUS_CLASS[status] ?? STATUS_CLASS.PENDING;
  const Icon = STATUS_ICON[status] ?? STATUS_ICON.PENDING;
  const s = SIZES[size];
  return (
    <span data-testid={testId} className={`inline-flex items-center ${s.badge} ${className}`}>
      <Icon aria-hidden="true" className={s.icon} />
      {statusLabel(status)}
    </span>
  );
}
