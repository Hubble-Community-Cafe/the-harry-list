export interface Reservation {
  id: number;
  confirmationNumber?: string;
  eventTitle: string;
  contactName: string;
  email: string;
  phoneNumber?: string;
  organizationName?: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  seatingArea?: string;
  status: string;
  expectedGuests: number;
  description?: string;
  paymentOption?: string;
  costCenter?: string;
  invoiceName?: string;
  invoiceAddress?: string;
  comments?: string;
  internalNotes?: string;
  termsAccepted?: boolean;
  confirmedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  specialActivities?: string[];
  invoiceType?: string;
  invoiceRemarks?: string;
  longReservationReason?: string;
  cateringDietaryNotes?: string;
  cateringArranged?: boolean;
}

export interface FormConstraint {
  id?: number;
  constraintType: string;
  triggerActivity: string;
  targetValue?: string;
  numericValue?: number;
  secondaryValue?: string;
  message: string;
  enabled: boolean;
  updatedAt?: string;
}

export interface EmailAttachment {
  id: number;
  name: string;
  filename: string;
  contentType: string;
  active: boolean;
  createdAt: string;
}

export interface CateringEmailRequest {
  attachmentIds: number[];
  subject?: string;
  body?: string;
  replyTo?: string;
}

export type RecurrenceType =
  | 'NONE'
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'YEARLY'
  | 'MONTHLY_NTH_WEEKDAY';

/** Weekday encoding shared with the backend (java.time.DayOfWeek names). */
export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface CalendarAppointment {
  id?: number;
  title: string;
  description?: string;
  date: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
  location: string;
  recurrenceType: RecurrenceType;
  /** "Every N" multiplier (RRULE INTERVAL). Null/1 means every period. */
  recurrenceInterval?: number;
  /** For MONTHLY_NTH_WEEKDAY: 1–4 for first–fourth, or -1 for last. */
  recurrenceWeekOfMonth?: number;
  /** For MONTHLY_NTH_WEEKDAY: which weekday, e.g. FRIDAY for "2nd Friday". */
  recurrenceDayOfWeek?: DayOfWeek;
  recurrenceEndDate?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlockedPeriod {
  id?: number;
  location?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  reason: string;
  publicMessage?: string;
  /** When true, the period warns but does not block reservations. */
  softBlock?: boolean;
  /** Optional checkbox label the guest must tick to acknowledge a soft block. */
  acknowledgementText?: string;
  enabled: boolean;
  updatedAt?: string;
}

