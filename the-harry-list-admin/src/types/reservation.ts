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

export interface BlockedPeriod {
  id?: number;
  location?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  reason: string;
  publicMessage?: string;
  enabled: boolean;
  updatedAt?: string;
}

