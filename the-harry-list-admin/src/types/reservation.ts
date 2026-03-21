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

