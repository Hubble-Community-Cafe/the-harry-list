export interface ReservationFormData {
  // Contact Information
  contactName: string;
  email: string;
  phoneNumber?: string;
  organizationName?: string;

  // Event Details
  eventTitle: string;
  description: string;
  specialActivities: string[];
  expectedGuests: number;

  // Date and Time
  eventDate: string;
  startTime: string;
  endTime: string;
  longReservationReason?: string;

  // Location
  location?: string | null;
  seatingArea: string;

  // Payment
  paymentOption: string;
  invoiceType?: string;
  costCenter?: string;
  invoiceName?: string;
  invoiceAddress?: string;
  invoiceRemarks?: string;

  // Catering
  cateringDietaryNotes?: string;

  // Additional
  comments?: string;
  termsAccepted: boolean;
}

export interface SubmissionResult {
  confirmationNumber: string;
  eventTitle: string;
  contactName: string;
  email: string;
  message: string;
}

export interface FormOptions {
  specialActivities: SelectOption[];
  invoiceTypes: SelectOption[];
  locations: SelectOption[];
  paymentOptions: SelectOption[];
  seatingAreas: SelectOption[];
}

export interface SelectOption {
  value: string;
  displayName: string;
  description?: string;
}

export interface FormConstraint {
  id: number;
  constraintType: 'ACTIVITY_CONFLICT' | 'LOCATION_LOCK' | 'SEATING_LOCK' | 'TIME_RESTRICTION' | 'ADVANCE_BOOKING' | 'GUEST_LIMIT' | 'GUEST_MINIMUM';
  triggerActivity: string;
  targetValue?: string;
  numericValue?: number;
  secondaryValue?: string;
  message: string;
  enabled: boolean;
}

export interface BlockedPeriod {
  id: number;
  location?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  reason: string;
  publicMessage?: string;
  enabled: boolean;
}
