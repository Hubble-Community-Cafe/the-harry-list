// Staff-facing names for the codes the backend stores (PENDING, HUBBLE, ONE_PERSON, ...).
// Pages show these instead of the raw codes; the codes themselves stay in data and filters.

/** "NO_PREFERENCE" -> "No preference": the fallback for a code without a label (yet). */
export function humanize(code: string): string {
  const words = code.toLowerCase().replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function labelFrom(labels: Record<string, string>) {
  return (code: string | null | undefined): string => (code ? labels[code] ?? humanize(code) : '');
}

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
};
export const statusLabel = labelFrom(STATUS_LABELS);

export const LOCATION_LABELS: Record<string, string> = {
  HUBBLE: 'Hubble',
  METEOR: 'Meteor',
  NO_PREFERENCE: 'No preference',
};
/** An empty location means the guest has no preference. */
export const locationLabel = (code: string | null | undefined): string =>
  code ? LOCATION_LABELS[code] ?? humanize(code) : LOCATION_LABELS.NO_PREFERENCE;

export const PAYMENT_LABELS: Record<string, string> = {
  INDIVIDUAL: 'People pay individually',
  ONE_PERSON: 'One person pays at the end',
  INVOICE: 'Invoice',
};
export const paymentLabel = labelFrom(PAYMENT_LABELS);

export const INVOICE_TYPE_LABELS: Record<string, string> = {
  TUE: 'TU/e',
  FONTYS: 'Fontys',
  EXTERNAL: 'External',
};
export const invoiceTypeLabel = labelFrom(INVOICE_TYPE_LABELS);

export const SEATING_LABELS: Record<string, string> = {
  INSIDE: 'Inside',
  OUTSIDE: 'Outside',
};
export const seatingLabel = labelFrom(SEATING_LABELS);

export const ACTIVITY_LABELS: Record<string, string> = {
  GRADUATION: 'Graduation / PhD Defense',
  EAT_A_LA_CARTE: 'Eat a la Carte',
  EAT_CATERING: 'Eat Catering',
  CATERING_CORONA_ROOM: 'Catering Corona Room',
  PRIVATE_EVENT: 'Private Event (retired)',
};
export const activityLabel = labelFrom(ACTIVITY_LABELS);

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
};
export const roleLabel = labelFrom(ROLE_LABELS);

/**
 * A constraint's target can be a location, a seating area or an activity; anything else
 * (a time range, say) is free text and shown as it is.
 */
export function constraintValueLabel(value: string | null | undefined): string {
  if (!value) return '';
  if (value === 'CONFIRM') return 'asks to confirm';
  return LOCATION_LABELS[value] ?? SEATING_LABELS[value] ?? ACTIVITY_LABELS[value] ?? value;
}

const VALUE_LABELS_BY_FIELD: Record<string, (code: string) => string> = {
  status: statusLabel,
  location: locationLabel,
  paymentOption: paymentLabel,
  invoiceType: invoiceTypeLabel,
  seatingArea: seatingLabel,
  role: roleLabel,
  specialActivities: (codes) => codes.split(',').map((c) => activityLabel(c.trim())).join(', '),
};

/** "paymentOption" -> "Payment option": a changed field's name in the history. */
export function fieldLabel(field: string): string {
  return humanize(field.replace(/([a-z])([A-Z])/g, '$1_$2'));
}

/** A value in the change history, in words; "(empty)" when there was none. */
export function changeValueLabel(field: string, value: string | null | undefined): string {
  if (value == null || value === '') return '(empty)';
  const label = VALUE_LABELS_BY_FIELD[field];
  return label ? label(value) : value;
}
