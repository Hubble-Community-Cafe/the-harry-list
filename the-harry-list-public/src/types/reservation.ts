export interface ReservationFormData {
  // Contact Information
  contactName: string;
  email: string;
  phoneNumber?: string;
  organizationName?: string;

  // Event Details
  eventTitle: string;
  description?: string;
  eventType: string;
  organizerType: string;
  expectedGuests: number;

  // Date and Time
  eventDate: string;
  startTime: string;
  endTime: string;

  // Location
  location: string;
  seatingArea?: string;
  specificArea?: string;

  // Payment
  paymentOption: string;
  costCenter?: string;
  invoiceName?: string;
  invoiceAddress?: string;

  // Food & Drinks
  foodRequired?: boolean;
  dietaryPreference?: string;
  dietaryNotes?: string;

  // Additional
  comments?: string;
  termsAccepted: boolean;
}

export interface SubmissionResult {
  confirmationNumber: number;
  eventTitle: string;
  contactName: string;
  email: string;
  message: string;
}

export interface FormOptions {
  eventTypes: SelectOption[];
  organizerTypes: SelectOption[];
  locations: SelectOption[];
  paymentOptions: SelectOption[];
  dietaryPreferences: SelectOption[];
}

export interface SelectOption {
  value: string;
  displayName: string;
  description?: string;
}

