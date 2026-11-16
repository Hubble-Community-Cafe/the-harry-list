// Longest text the backend accepts per field (the @Size limits on PublicReservationRequest and
// the database columns). The form stops typing at these lengths, so a guest never loses a
// long message to a rejected submit.
export const MAX_LENGTH = {
  contactName: 255,
  email: 255,
  phoneNumber: 50,
  organizationName: 255,
  eventTitle: 255,
  description: 5000,
  longReservationReason: 1000,
  costCenter: 100,
  invoiceName: 255,
  invoiceAddress: 500,
  invoiceRemarks: 1000,
  cateringDietaryNotes: 1000,
  comments: 5000,
} as const;

export type LimitedField = keyof typeof MAX_LENGTH;

/** Same wording as the backend's validation message. */
export function tooLongMessage(label: string, field: LimitedField): string {
  return `${label} must not exceed ${MAX_LENGTH[field]} characters`;
}
