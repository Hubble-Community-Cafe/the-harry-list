/** The CSS class (from the shared --status-* tokens) for each reservation status. */
export const STATUS_CLASS: Record<string, string> = {
  PENDING: 'status-pending',
  CONFIRMED: 'status-confirmed',
  REJECTED: 'status-rejected',
  CANCELLED: 'status-cancelled',
};

/** CSS class for the coloured left edge of a card in this status (week overview). */
export const statusEdgeClass = (status: string): string =>
  STATUS_CLASS[status] ? `status-edge-${status.toLowerCase()}` : 'border-l-dark-600';
