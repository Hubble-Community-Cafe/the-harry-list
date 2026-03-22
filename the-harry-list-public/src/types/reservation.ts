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
  confirmationNumber: number;
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
