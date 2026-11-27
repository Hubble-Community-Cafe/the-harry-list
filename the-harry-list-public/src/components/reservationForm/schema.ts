import { z } from 'zod';
import { MAX_LENGTH, tooLongMessage } from '../../lib/fieldLimits';
import { LONG_RESERVATION_MINUTES } from '../../lib/formRules';

// Field validation for the reservation form. Cross-field rules (invoice details, long
// reservations) are checked in superRefine; constraint-driven rules live in lib/formRules.
const phoneRegex = /^(\+?[0-9]{1,4}[\s.-]?)?(\(?[0-9]{1,4}\)?[\s.-]?)?[0-9]{1,4}[\s.-]?[0-9]{1,4}[\s.-]?[0-9]{1,9}$/;

export const formSchema = z.object({
  contactName: z.string().min(2, 'Name must be at least 2 characters').max(MAX_LENGTH.contactName, tooLongMessage('Name', 'contactName')),
  email: z.string().email('Please enter a valid email').max(MAX_LENGTH.email, tooLongMessage('Email', 'email')),
  phoneNumber: z.string()
    .max(MAX_LENGTH.phoneNumber, tooLongMessage('Phone number', 'phoneNumber'))
    .optional()
    .refine(val => !val || phoneRegex.test(val), 'Please enter a valid phone number'),
  organizationName: z.string().max(MAX_LENGTH.organizationName, tooLongMessage('Organization name', 'organizationName')).optional(),
  eventTitle: z.string().min(2, 'Event title is required').max(MAX_LENGTH.eventTitle, tooLongMessage('Event title', 'eventTitle')),
  description: z.string().min(1, 'Please describe your event').max(MAX_LENGTH.description, tooLongMessage('Description', 'description')),
  specialActivities: z.array(z.string()),
  expectedGuests: z.number().min(1, 'Minimum reservation size is 1 person').max(500, 'Please contact us directly for groups over 500 people'),
  eventDate: z.string().min(1, 'Please select a date'),
  startTime: z.string().min(1, 'Please select a start time'),
  endTime: z.string().min(1, 'Please select an end time'),
  longReservationReason: z.string().max(MAX_LENGTH.longReservationReason, tooLongMessage('Long reservation reason', 'longReservationReason')).optional(),
  location: z.string().nullable().optional(),
  seatingArea: z.string().min(1, 'Please select a seating area'),
  paymentOption: z.string().min(1, 'Please select a payment option'),
  invoiceType: z.string().optional(),
  costCenter: z.string().max(MAX_LENGTH.costCenter, tooLongMessage('Cost centre', 'costCenter')).optional(),
  invoiceName: z.string().max(MAX_LENGTH.invoiceName, tooLongMessage('Invoice name', 'invoiceName')).optional(),
  invoiceAddress: z.string().max(MAX_LENGTH.invoiceAddress, tooLongMessage('Invoice address', 'invoiceAddress')).optional(),
  invoiceRemarks: z.string().max(MAX_LENGTH.invoiceRemarks, tooLongMessage('Invoice remarks', 'invoiceRemarks')).optional(),
  cateringDietaryNotes: z.string().max(MAX_LENGTH.cateringDietaryNotes, tooLongMessage('Catering dietary notes', 'cateringDietaryNotes')).optional(),
  comments: z.string().max(MAX_LENGTH.comments, tooLongMessage('Comments', 'comments')).optional(),
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms'),
}).superRefine((data, ctx) => {
  // Invoice type required when payment is INVOICE
  if (data.paymentOption === 'INVOICE' && (!data.invoiceType || data.invoiceType.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please select an invoice type',
      path: ['invoiceType'],
    });
  }

  // Cost centre (kostenplaats) required for TUE/FONTYS invoice
  if (data.paymentOption === 'INVOICE' && (data.invoiceType === 'TUE' || data.invoiceType === 'FONTYS')) {
    if (!data.costCenter || data.costCenter.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cost centre (kostenplaats) is required',
        path: ['costCenter'],
      });
    }
  }

  // External invoice requires name and address
  if (data.paymentOption === 'INVOICE' && data.invoiceType === 'EXTERNAL') {
    if (!data.invoiceName || data.invoiceName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Company name is required',
        path: ['invoiceName'],
      });
    }
    if (!data.invoiceAddress || data.invoiceAddress.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Address is required',
        path: ['invoiceAddress'],
      });
    }
  }

  // Note: advance booking validation is enforced dynamically in the form
  // and server-side via ConstraintValidationService. This is a static fallback.

  // Long reservation reason required when duration > 3 hours
  if (data.startTime && data.endTime) {
    const [sh, sm] = data.startTime.split(':').map(Number);
    const [eh, em] = data.endTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    let endMins = eh * 60 + em;
    if (endMins <= startMins) endMins += 24 * 60; // next day
    if (endMins - startMins > LONG_RESERVATION_MINUTES && (!data.longReservationReason || data.longReservationReason.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please explain why you need more than 3 hours',
        path: ['longReservationReason'],
      });
    }
  }
});
