import { useState, useCallback, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import {
  User, Mail, Phone, Building2, Calendar, MapPin,
  CreditCard, Send, Loader2,
  ChevronRight, ChevronLeft, Sparkles, Plus, Minus, CalendarDays,
  ClipboardCheck, AlertTriangle
} from 'lucide-react';
import { submitReservation, fetchFormOptions, fetchFormConstraints, fetchBlockedPeriods, getRecaptchaSiteKey } from '../lib/api';
import type { ReservationFormData, FormOptions, FormConstraint, BlockedPeriod } from '../types/reservation';

// Phone number validation - allows international formats
const phoneRegex = /^(\+?[0-9]{1,4}[\s.-]?)?(\(?[0-9]{1,4}\)?[\s.-]?)?[0-9]{1,4}[\s.-]?[0-9]{1,4}[\s.-]?[0-9]{1,9}$/;

const formSchema = z.object({
  contactName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phoneNumber: z.string()
    .optional()
    .refine(val => !val || phoneRegex.test(val), 'Please enter a valid phone number'),
  organizationName: z.string().optional(),
  eventTitle: z.string().min(2, 'Event title is required'),
  description: z.string().min(1, 'Please describe your event'),
  specialActivities: z.array(z.string()),
  expectedGuests: z.number().min(1, 'Minimum reservation size is 1 person').max(500, 'Please contact us directly for groups over 500 people'),
  eventDate: z.string().min(1, 'Please select a date'),
  startTime: z.string().min(1, 'Please select a start time'),
  endTime: z.string().min(1, 'Please select an end time'),
  longReservationReason: z.string().optional(),
  location: z.string().nullable().optional(),
  seatingArea: z.string().min(1, 'Please select a seating area'),
  paymentOption: z.string().min(1, 'Please select a payment option'),
  invoiceType: z.string().optional(),
  costCenter: z.string().optional(),
  invoiceName: z.string().optional(),
  invoiceAddress: z.string().optional(),
  invoiceRemarks: z.string().optional(),
  cateringDietaryNotes: z.string().optional(),
  comments: z.string().optional(),
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

  // Kostenplaats required for TUE/FONTYS invoice
  if (data.paymentOption === 'INVOICE' && (data.invoiceType === 'TUE' || data.invoiceType === 'FONTYS')) {
    if (!data.costCenter || data.costCenter.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Kostenplaats is required',
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
    if (endMins - startMins > 180 && (!data.longReservationReason || data.longReservationReason.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please explain why you need more than 3 hours',
        path: ['longReservationReason'],
      });
    }
  }
});

interface ReservationResult {
  confirmationNumber: string;
  eventTitle: string;
  contactName: string;
  email: string;
}

interface ReservationFormProps {
  onSuccess: (result: ReservationResult) => void;
}

const steps = [
  { id: 1, title: 'Contact', icon: User },
  { id: 2, title: 'Activity', icon: Calendar },
  { id: 3, title: 'Location', icon: MapPin },
  { id: 4, title: 'Payment', icon: CreditCard },
  { id: 5, title: 'Confirm', icon: ClipboardCheck },
];

const SPECIAL_ACTIVITY_LABELS: Record<string, string> = {
  GRADUATION: 'Graduation / PhD Defense',
  EAT_A_LA_CARTE: 'Eat a la Carte',
  EAT_CATERING: 'Catering',
  CATERING_CORONA_ROOM: 'Catering for Corona Room Event',
  PRIVATE_EVENT: 'Private Event',
};

const SPECIAL_ACTIVITY_DESCRIPTIONS: Record<string, string> = {
  GRADUATION: 'Celebrating a graduation or PhD defense',
  EAT_A_LA_CARTE: 'Order from the menu (max 15 guests)',
  EAT_CATERING: 'Catered food for your event',
  CATERING_CORONA_ROOM: 'Catering for a Corona Room event (Hubble only)',
  PRIVATE_EVENT: 'Private/closed event (Meteor only)',
};

export function ReservationForm({ onSuccess }: ReservationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formOptions, setFormOptions] = useState<FormOptions | null>(null);
  const [constraints, setConstraints] = useState<FormConstraint[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // reCAPTCHA v3 hook - only available when site key is configured
  const { executeRecaptcha } = useGoogleReCaptcha();
  const recaptchaEnabled = Boolean(getRecaptchaSiteKey());

  useEffect(() => {
    async function loadOptions() {
      try {
        const [options, fetchedConstraints, fetchedBlockedPeriods] = await Promise.all([
          fetchFormOptions(),
          fetchFormConstraints(),
          fetchBlockedPeriods(),
        ]);
        setFormOptions(options);
        setConstraints(fetchedConstraints);
        setBlockedPeriods(fetchedBlockedPeriods);
      } catch (error) {
        setOptionsError('Failed to load form options. Please refresh the page.');
        console.error('Failed to fetch form options:', error);
      } finally {
        setOptionsLoading(false);
      }
    }
    loadOptions();
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ReservationFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      termsAccepted: false,
      expectedGuests: 8,
      specialActivities: [],
    },
  });

  const watchLocation = watch('location');
  const watchPaymentOption = watch('paymentOption');
  const watchInvoiceType = watch('invoiceType');
  const watchSpecialActivitiesRaw = watch('specialActivities');
  const watchSpecialActivities = useMemo(() => watchSpecialActivitiesRaw || [], [watchSpecialActivitiesRaw]);
  const watchStartTime = watch('startTime');
  const watchEndTime = watch('endTime');
  const watchExpectedGuests = watch('expectedGuests');

  // Constraint: location lock derived from dynamic constraints or guest count
  const locationLocked = useMemo(() => {
    for (const c of constraints) {
      if (c.constraintType === 'LOCATION_LOCK' && watchSpecialActivities.includes(c.triggerActivity)) {
        return c.targetValue || null;
      }
    }
    // Fewer than 8 guests requires Meteor (location-specific minimum)
    if (watchExpectedGuests !== undefined && watchExpectedGuests >= 1 && watchExpectedGuests < 8) {
      return 'METEOR';
    }
    return null;
  }, [watchSpecialActivities, constraints, watchExpectedGuests]);

  // Conflict: guests require Meteor, but an activity locks to a different location
  const locationConflict = useMemo(() => {
    if (!watchExpectedGuests || watchExpectedGuests >= 8) return null;
    for (const c of constraints) {
      if (c.constraintType === 'LOCATION_LOCK' && watchSpecialActivities.includes(c.triggerActivity)) {
        if (c.targetValue && c.targetValue !== 'METEOR') {
          return `Reservations under 8 guests are only available at Meteor, but the selected activity requires ${c.targetValue}. Please increase the number of guests or remove the incompatible activity.`;
        }
      }
    }
    return null;
  }, [watchExpectedGuests, constraints, watchSpecialActivities]);

  // Auto-set location when locked
  useEffect(() => {
    if (locationLocked) {
      setValue('location', locationLocked);
    }
  }, [locationLocked, setValue]);

  // Constraint: seating lock derived from dynamic constraints
  const seatingLocked = useMemo(() => {
    for (const c of constraints) {
      if (c.constraintType === 'SEATING_LOCK' && watchSpecialActivities.includes(c.triggerActivity)) {
        return c.targetValue || null;
      }
    }
    return null;
  }, [watchSpecialActivities, constraints]);

  // Auto-set seating area when locked
  useEffect(() => {
    if (seatingLocked) {
      setValue('seatingArea', seatingLocked);
    }
  }, [seatingLocked, setValue]);

  // Calculate duration for long reservation warning
  const durationMinutes = useMemo(() => {
    if (!watchStartTime || !watchEndTime) return 0;
    const [sh, sm] = watchStartTime.split(':').map(Number);
    const [eh, em] = watchEndTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    let endMins = eh * 60 + em;
    if (endMins <= startMins) endMins += 24 * 60;
    return endMins - startMins;
  }, [watchStartTime, watchEndTime]);

  // Check if catering activities selected
  const hasCateringActivity = watchSpecialActivities.includes('EAT_CATERING') ||
    watchSpecialActivities.includes('CATERING_CORONA_ROOM');

  // Guest limit warnings from dynamic constraints
  const guestLimitWarning = useMemo(() => {
    for (const c of constraints) {
      if (c.constraintType === 'GUEST_LIMIT'
          && watchSpecialActivities.includes(c.triggerActivity)
          && c.numericValue
          && watchExpectedGuests > c.numericValue) {
        return c.message;
      }
    }
    return null;
  }, [constraints, watchSpecialActivities, watchExpectedGuests]);

  // Minimum guests from dynamic constraints (location-specific)
  const minGuests = useMemo(() => {
    let min = 1; // default minimum
    for (const c of constraints) {
      if (c.constraintType === 'GUEST_MINIMUM' && c.numericValue !== undefined) {
        const appliesToLocation = !c.targetValue || c.targetValue === watchLocation;
        if (appliesToLocation && c.numericValue < min) {
          min = c.numericValue;
        }
      }
    }
    return min;
  }, [constraints, watchLocation]);

  // Advance booking from dynamic constraints
  const advanceBookingDays = useMemo(() => {
    let maxDays = 0;
    for (const c of constraints) {
      if (c.constraintType === 'ADVANCE_BOOKING'
          && watchSpecialActivities.includes(c.triggerActivity)
          && c.numericValue
          && c.numericValue > maxDays) {
        maxDays = c.numericValue;
      }
    }
    return maxDays;
  }, [constraints, watchSpecialActivities]);

  // Blocked period check for selected date
  const watchEventDate = watch('eventDate');
  const blockedDateWarning = useMemo(() => {
    if (!watchEventDate || blockedPeriods.length === 0) return null;
    const selectedDate = watchEventDate;
    const selectedLocation = watchLocation;
    const selectedTime = watchStartTime;
    for (const bp of blockedPeriods) {
      if (selectedDate >= bp.startDate && selectedDate <= bp.endDate) {
        if (bp.location) {
          // Location-specific block: only warn if user selected that exact location
          if (!selectedLocation || selectedLocation === 'NO_PREFERENCE' || selectedLocation === '' || bp.location !== selectedLocation) {
            continue;
          }
        }
        // Time-specific block: only warn if user's start time falls within the blocked window
        if (bp.startTime && bp.endTime) {
          if (!selectedTime || selectedTime < bp.startTime || selectedTime >= bp.endTime) {
            continue;
          }
        }
        // Global block (no location) or matching location
        return bp.publicMessage || 'This date is not available for reservations.';
      }
    }
    return null;
  }, [watchEventDate, blockedPeriods, watchLocation, watchStartTime]);

  const requiresAdvanceBooking = advanceBookingDays > 0;
  const minDateForBooking = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (advanceBookingDays > 0) d.setDate(d.getDate() + advanceBookingDays);
    return d.toISOString().split('T')[0];
  }, [advanceBookingDays]);

  // Generate 15-min interval time slots
  const generateTimeSlots = useCallback((startHour: number, endHour: number, crossesMidnight: boolean) => {
    const times: string[] = [];
    if (crossesMidnight) {
      for (let h = startHour; h <= 23; h++) {
        for (let m = 0; m < 60; m += 15) {
          times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
      }
      for (let h = 0; h <= endHour; h++) {
        const maxM = h === endHour ? 0 : 45;
        for (let m = 0; m <= maxM; m += 15) {
          times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
      }
    } else {
      for (let h = startHour; h <= endHour; h++) {
        const maxM = h === endHour ? 0 : 45;
        for (let m = 0; m <= maxM; m += 15) {
          times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
      }
    }
    return times;
  }, []);

  // Start times: derived from TIME_RESTRICTION constraints
  const startTimes = useMemo(() => {
    let hasEarlyAccess = false;
    for (const c of constraints) {
      if (c.constraintType === 'TIME_RESTRICTION'
          && c.targetValue === 'EARLY_ACCESS'
          && watchSpecialActivities.includes(c.triggerActivity)) {
        hasEarlyAccess = true;
        break;
      }
    }
    const startHour = hasEarlyAccess ? 9 : 11;
    return generateTimeSlots(startHour, 2, true);
  }, [watchSpecialActivities, constraints, generateTimeSlots]);

  // End times: only show slots strictly after the selected start time
  const endTimes = useMemo(() => {
    const all = generateTimeSlots(9, 2, true);
    if (!watchStartTime) return all;
    const [sh, sm] = watchStartTime.split(':').map(Number);
    const startNorm = sh < 9 ? sh * 60 + sm + 1440 : sh * 60 + sm;
    return all.filter(t => {
      const [eh, em] = t.split(':').map(Number);
      const endNorm = eh < 9 ? eh * 60 + em + 1440 : eh * 60 + em;
      return endNorm > startNorm;
    });
  }, [watchStartTime, generateTimeSlots]);

  // Start time warnings
  const startTimeWarning = useMemo(() => {
    if (!watchStartTime) return null;
    const [h, m] = watchStartTime.split(':').map(Number);
    const mins = h * 60 + m;
    const isMeteorOnly = watchSpecialActivities.includes('PRIVATE_EVENT');
    // Kitchen warnings only apply to Hubble
    if (!isMeteorOnly && mins >= 11 * 60 && mins < 12 * 60) {
      return 'Kitchen opens at 12:00 - food may not be available at this time.';
    }
    if (mins >= 19 * 60 + 30 || (h < 3 && mins >= 0)) {
      return 'Kitchen is only open for snacks after 19:30.';
    }
    return null;
  }, [watchStartTime, watchSpecialActivities]);

  const validateStep = async (step: number) => {
    const step4Fields: (keyof ReservationFormData)[] = ['paymentOption'];
    if (watchPaymentOption === 'INVOICE') {
      step4Fields.push('invoiceType');
      if (watchInvoiceType === 'TUE' || watchInvoiceType === 'FONTYS') {
        step4Fields.push('costCenter');
      } else if (watchInvoiceType === 'EXTERNAL') {
        step4Fields.push('invoiceName', 'invoiceAddress');
      }
    }

    const fieldsToValidate: (keyof ReservationFormData)[][] = [
      ['contactName', 'email', 'phoneNumber'], // Step 1
      ['eventTitle', 'description', 'expectedGuests', 'eventDate', 'startTime', 'endTime', 'longReservationReason'], // Step 2
      ['seatingArea'], // Step 3 (location is optional/NO_PREFERENCE)
      step4Fields, // Step 4
      ['termsAccepted'], // Step 5
    ];

    // Block step 2 advance if guest limit constraint violated
    if (step === 2 && guestLimitWarning) {
      return false;
    }

    // Block step 2 advance if guest count conflicts with activity location lock
    if (step === 2 && locationConflict) {
      return false;
    }

    // Block advance if date is in a blocked period (step 2 for global blocks, step 3 for location-specific)
    if ((step === 2 || step === 3) && blockedDateWarning) {
      return false;
    }

    // Block step 2 advance if long reservation reason is missing
    if (step === 2 && durationMinutes > 180 && !getValues('longReservationReason')?.trim()) {
      await trigger('longReservationReason');
      return false;
    }

    const result = await trigger(fieldsToValidate[step - 1]);
    return result;
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < steps.length) {
      setSubmitError(null);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setSubmitError(null);
      setCurrentStep(currentStep - 1);
    }
  };

  // Activity conflicts derived from dynamic constraints
  const activityConflicts = useMemo(() => {
    const conflicts: Record<string, string[]> = {};
    for (const c of constraints) {
      if (c.constraintType === 'ACTIVITY_CONFLICT' && c.targetValue) {
        if (!conflicts[c.triggerActivity]) conflicts[c.triggerActivity] = [];
        conflicts[c.triggerActivity].push(c.targetValue);
      }
    }
    return conflicts;
  }, [constraints]);

  const isActivityBlocked = (activity: string, current: string[]): boolean =>
    (activityConflicts[activity] || []).some(conflict => current.includes(conflict));

  const toggleActivity = (activity: string) => {
    const current = getValues('specialActivities') || [];
    if (current.includes(activity)) {
      setValue('specialActivities', current.filter(a => a !== activity));
    } else if (!isActivityBlocked(activity, current)) {
      setValue('specialActivities', [...current, activity]);
    }
  };

  const onSubmit = useCallback(async (data: ReservationFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let recaptchaToken: string | undefined;

      // Execute reCAPTCHA if enabled and available
      if (recaptchaEnabled && executeRecaptcha) {
        try {
          recaptchaToken = await executeRecaptcha('submit_reservation');
        } catch (recaptchaError) {
          console.error('reCAPTCHA execution failed:', recaptchaError);
          setSubmitError('Security verification failed. Please refresh the page and try again.');
          setIsSubmitting(false);
          return;
        }
      }

      const result = await submitReservation(data, recaptchaToken);
      onSuccess(result);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit reservation');
    } finally {
      setIsSubmitting(false);
    }
  }, [executeRecaptcha, recaptchaEnabled, onSuccess]);

  // Summary helper for Step 5
  const getPaymentLabel = () => {
    const opt = watchPaymentOption;
    if (opt === 'INDIVIDUAL') return 'People pay individually';
    if (opt === 'ONE_PERSON') return 'One person pays at the end';
    if (opt === 'INVOICE') {
      const type = watchInvoiceType;
      if (type === 'TUE') return `Invoice - TU/e (${getValues('costCenter') || ''})`;
      if (type === 'FONTYS') return `Invoice - Fontys (${getValues('costCenter') || ''})`;
      if (type === 'EXTERNAL') return `Invoice - External (${getValues('invoiceName') || ''})`;
      return 'Invoice';
    }
    return opt || 'Not selected';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Important Notes Banner - Only on first step */}
      {currentStep === 1 && (
        <div className="mb-6 bg-dark-800/80 border border-dark-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span className="text-lg">📋</span> Please Note
          </h3>
          <ul className="text-xs text-dark-300 space-y-1.5">
            <li>• This is a <span className="text-white font-medium">request form</span> – there are no obligations for you or us</li>
            <li>• We generally cannot reply within 72 hours</li>
            <li>• If you want to come in today, just walk in – we always save spots for walk-in guests</li>
            <li>• Please do not call about reservations – they are not managed by phone</li>
          </ul>
        </div>
      )}

      {/* Options Loading Error */}
      {optionsError && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400 text-center">
          {optionsError}
        </div>
      )}

      {/* Loading State */}
      {optionsLoading && (
        <div className="mb-6 flex items-center justify-center gap-2 text-dark-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading form options...</span>
        </div>
      )}

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2 md:gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                  disabled={step.id > currentStep}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200
                    ${isActive
                      ? 'bg-gradient-to-r from-hubble-600 to-hubble-500 text-white shadow-lg shadow-hubble-500/25'
                      : isCompleted
                        ? 'bg-dark-800 text-hubble-400 hover:bg-dark-700 cursor-pointer'
                        : 'bg-dark-900 text-dark-500 cursor-not-allowed'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
                </button>
                {index < steps.length - 1 && (
                  <ChevronRight className={`w-4 h-4 mx-1 ${isCompleted ? 'text-hubble-500' : 'text-dark-700'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit(onSubmit, (fieldErrors) => {
        console.error('Form validation failed on submit:', fieldErrors);
        const stepFields: (keyof ReservationFormData)[][] = [
          ['contactName', 'email', 'phoneNumber'],
          ['eventTitle', 'description', 'expectedGuests', 'eventDate', 'startTime', 'endTime', 'longReservationReason'],
          ['location', 'seatingArea'],
          ['paymentOption', 'invoiceType', 'costCenter', 'invoiceName', 'invoiceAddress'],
          ['termsAccepted'],
        ];
        const failingStep = stepFields.findIndex(fields => fields.some(f => f in fieldErrors));
        const failingFields = Object.keys(fieldErrors).join(', ');
        if (failingStep >= 0) {
          setCurrentStep(failingStep + 1);
          setSubmitError(null); // let inline field errors do the talking
        } else {
          setSubmitError(`Some required fields are invalid (${failingFields}). Please review all steps.`);
        }
      })} className="card animate-fade-in">
        {/* Step 1: Contact Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-hubble-500/20">
                <User className="w-5 h-5 text-hubble-400" />
              </div>
              <div>
                <h2 className="text-xl font-title font-semibold text-white">Contact Information</h2>
                <p className="text-sm text-dark-400 font-light">Tell us how to reach you</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="label">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 z-10 pointer-events-none" />
                  <input
                    type="text"
                    {...register('contactName')}
                    className="input-field pl-10"
                    placeholder="John Doe"
                  />
                </div>
                {errors.contactName && <p className="error-text">{errors.contactName.message}</p>}
              </div>

              <div className="form-group">
                <label className="label">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 z-10 pointer-events-none" />
                  <input
                    type="email"
                    {...register('email')}
                    className="input-field pl-10"
                    placeholder="john@example.com"
                  />
                </div>
                {errors.email && <p className="error-text">{errors.email.message}</p>}
              </div>

              <div className="form-group">
                <label className="label">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 z-10 pointer-events-none" />
                  <input
                    type="tel"
                    {...register('phoneNumber')}
                    className="input-field pl-10"
                    placeholder="+31 6 12345678"
                  />
                </div>
                {errors.phoneNumber && <p className="error-text">{errors.phoneNumber.message}</p>}
              </div>

              <div className="form-group">
                <label className="label">Organization / Association</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 z-10 pointer-events-none" />
                  <input
                    type="text"
                    {...register('organizationName')}
                    className="input-field pl-10"
                    placeholder="Your organization name"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Activity Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-meteor-500/20">
                <Calendar className="w-5 h-5 text-meteor-400" />
              </div>
              <div>
                <h2 className="text-xl font-title font-semibold text-white">Activity Details</h2>
                <p className="text-sm text-dark-400 font-light">Tell us about your event</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Event Title */}
              <div className="form-group md:col-span-2">
                <label className="label">Event Title *</label>
                <input
                  type="text"
                  {...register('eventTitle')}
                  className="input-field"
                  placeholder="Annual Association Drinks"
                />
                {errors.eventTitle && <p className="error-text">{errors.eventTitle.message}</p>}
              </div>

              {/* Special Activities */}
              <div className="form-group md:col-span-2">
                <label className="label">Special Activities</label>
                <p className="text-xs text-dark-400 mb-3">Select any special activities for your event (optional, if you want a regular drink/borrel you can leave this empty)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(formOptions?.specialActivities ?? Object.entries(SPECIAL_ACTIVITY_LABELS).map(([value, displayName]) => ({ value, displayName, description: undefined }))).map((option) => {
                    const selected = watchSpecialActivities.includes(option.value);
                    const blocked = !selected && isActivityBlocked(option.value, watchSpecialActivities);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleActivity(option.value)}
                        disabled={blocked}
                        title={blocked ? 'Not compatible with another selected activity' : undefined}
                        className={`
                          relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left w-full
                          ${selected
                            ? 'border-hubble-500 bg-hubble-500/10'
                            : blocked
                              ? 'border-dark-800 bg-dark-900/50 opacity-40 cursor-not-allowed'
                              : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                          }
                        `}
                      >
                        <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                          selected ? 'border-hubble-500 bg-hubble-500' : 'border-dark-600 bg-dark-800'
                        }`}>
                          {selected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <span className={`text-sm font-medium ${selected ? 'text-hubble-300' : 'text-white'}`}>
                            {option.displayName}
                          </span>
                          <p className="text-xs text-dark-400 mt-0.5">
                            {option.description ?? SPECIAL_ACTIVITY_DESCRIPTIONS[option.value]}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expected Guests */}
              <div className="form-group">
                <label className="label">Expected Number of Guests *</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const current = watch('expectedGuests') || minGuests;
                      if (current > minGuests) setValue('expectedGuests', current - 1);
                    }}
                    className="w-12 h-12 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400 hover:text-white hover:bg-dark-700 hover:border-hubble-500 transition-all disabled:opacity-50"
                    disabled={watch('expectedGuests') <= minGuests}
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      {...register('expectedGuests', { valueAsNumber: true })}
                      className="input-field text-center text-xl font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min={minGuests}
                      placeholder="50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const current = watch('expectedGuests') || minGuests;
                      setValue('expectedGuests', current + 1);
                    }}
                    className="w-12 h-12 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400 hover:text-white hover:bg-dark-700 hover:border-hubble-500 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                {errors.expectedGuests && <p className="error-text">{errors.expectedGuests.message}</p>}
                {guestLimitWarning && (
                  <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{guestLimitWarning}</span>
                  </div>
                )}
                {locationConflict ? (
                  <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{locationConflict}</span>
                  </div>
                ) : (watchExpectedGuests < 8 && watchExpectedGuests >= 1) ? (
                  <div className="mt-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                    Reservations under 8 guests are only available at Meteor. Location will be set automatically.
                  </div>
                ) : null}
                <div className="mt-2 text-xs text-dark-400">
                  <p>Minimum reservation size: <span className="text-white">{minGuests} {minGuests === 1 ? 'person' : 'people'}</span></p>
                </div>
              </div>

              {/* Event Date */}
              <div className="form-group">
                <label className="label">Event Date *</label>
                {requiresAdvanceBooking && (
                  <div className="mb-2 text-xs text-blue-400/80 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                    ℹ️ Selected activities require at least <strong>{advanceBookingDays} days</strong> advance booking.
                  </div>
                )}
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 z-10 pointer-events-none" />
                  <input
                    type="date"
                    {...register('eventDate')}
                    className="input-field pl-10 pr-4 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    min={minDateForBooking}
                  />
                </div>
                {errors.eventDate && <p className="error-text">{errors.eventDate.message}</p>}
                {blockedDateWarning && (
                  <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{blockedDateWarning}</span>
                  </div>
                )}
              </div>

              {/* Start Time */}
              <div className="form-group">
                <label className="label">Start Time *</label>
                <select {...register('startTime')} className="select-field">
                  <option value="">Select start time...</option>
                  {startTimes.map(time => <option key={time} value={time}>{time}</option>)}
                </select>
                {errors.startTime && <p className="error-text">{errors.startTime.message}</p>}
                {startTimeWarning && (
                  <div className="mt-2 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    <p>⚠️ <span className="font-medium">Note:</span> {startTimeWarning}</p>
                  </div>
                )}
              </div>

              {/* End Time */}
              <div className="form-group">
                <label className="label">End Time *</label>
                <select {...register('endTime')} className="select-field">
                  <option value="">Select end time...</option>
                  {endTimes.map(time => <option key={time} value={time}>{time}</option>)}
                </select>
                {errors.endTime && <p className="error-text">{errors.endTime.message}</p>}
              </div>

              {/* Long reservation reason */}
              {durationMinutes > 180 && (
                <div className="form-group md:col-span-2">
                  <label className="label flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Reason for Long Reservation *
                  </label>
                  <p className="text-xs text-amber-400/80 mb-2">
                    Your reservation is {Math.floor(durationMinutes / 60)}h{durationMinutes % 60 > 0 ? ` ${durationMinutes % 60}m` : ''} long.
                    Reservations over 3 hours require a reason.
                  </p>
                  <textarea
                    {...register('longReservationReason')}
                    className="input-field min-h-[80px] resize-none"
                    placeholder="Please explain why you need more than 3 hours..."
                  />
                  {errors.longReservationReason && <p className="error-text">{errors.longReservationReason.message}</p>}
                </div>
              )}

              {/* Catering dietary notes */}
              {hasCateringActivity && (
                <div className="form-group md:col-span-2">
                  <label className="label">Catering Dietary Notes</label>
                  <textarea
                    {...register('cateringDietaryNotes')}
                    className="input-field min-h-[80px] resize-none"
                    placeholder="Allergies, dietary requirements, or other catering notes..."
                  />
                </div>
              )}

              {/* Event Description */}
              <div className="form-group md:col-span-2">
                <label className="label">Event Description *</label>
                <textarea
                  {...register('description')}
                  className="input-field min-h-[100px] resize-none"
                  placeholder="Tell us more about your event..."
                />
                {errors.description && <p className="error-text">{errors.description.message}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-hubble-500/20">
                <MapPin className="w-5 h-5 text-hubble-400" />
              </div>
              <div>
                <h2 className="text-xl font-title font-semibold text-white">Location</h2>
                <p className="text-sm text-dark-400 font-light">Where would you like to host your event?</p>
              </div>
            </div>

            {/* Location constraint message */}
            {locationLocked && (() => {
              const lockConstraint = constraints.find(c =>
                c.constraintType === 'LOCATION_LOCK' && watchSpecialActivities.includes(c.triggerActivity));
              const guestBased = !lockConstraint && watchExpectedGuests < 8;
              return (
                <div className="text-xs text-blue-400/80 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                  {lockConstraint?.message
                    || (guestBased ? `Reservations under 8 guests are only available at Meteor.` : `Location is set to ${locationLocked}.`)}
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Hubble */}
              <label className={`
                relative flex flex-col p-6 rounded-xl border-2 transition-all duration-200
                ${locationLocked && locationLocked !== 'HUBBLE' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                ${watchLocation === 'HUBBLE'
                  ? 'border-hubble-500 bg-hubble-500/10'
                  : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                }
              `}>
                <input
                  type="radio"
                  {...register('location')}
                  value="HUBBLE"
                  className="sr-only"
                  disabled={!!locationLocked && locationLocked !== 'HUBBLE'}
                />
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-hubble-600 to-hubble-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Hubble</div>
                    <div className="text-xs text-dark-400">Community Cafe</div>
                  </div>
                </div>
                <p className="text-sm text-dark-400">
                  Hubble Community Cafe perfect for that Classic Ducky feeling.
                </p>
                {watchLocation === 'HUBBLE' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-hubble-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </label>

              {/* Meteor */}
              <label className={`
                relative flex flex-col p-6 rounded-xl border-2 transition-all duration-200
                ${locationLocked && locationLocked !== 'METEOR' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                ${watchLocation === 'METEOR'
                  ? 'border-meteor-500 bg-meteor-500/10'
                  : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                }
              `}>
                <input
                  type="radio"
                  {...register('location')}
                  value="METEOR"
                  className="sr-only"
                  disabled={!!locationLocked && locationLocked !== 'METEOR'}
                />
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-meteor-600 to-meteor-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Meteor</div>
                    <div className="text-xs text-dark-400">Community Cafe</div>
                  </div>
                </div>
                <p className="text-sm text-dark-400">
                  The new and modern Meteor, which includes a bear instead of a duck ;).
                </p>
                {watchLocation === 'METEOR' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-meteor-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </label>

              {/* No Preference */}
              <label className={`
                relative flex flex-col p-6 rounded-xl border-2 transition-all duration-200
                ${locationLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                ${!watchLocation || watchLocation === 'NO_PREFERENCE'
                  ? 'border-dark-400 bg-dark-700/50'
                  : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                }
              `}>
                <input
                  type="radio"
                  {...register('location')}
                  value=""
                  className="sr-only"
                  disabled={!!locationLocked}
                />
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-dark-500 to-dark-400 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">No Preference</div>
                    <div className="text-xs text-dark-400">We'll choose for you</div>
                  </div>
                </div>
                <p className="text-sm text-dark-400">
                  Let us pick the best location for your event. We'll confirm when we respond.
                </p>
                {(!watchLocation || watchLocation === 'NO_PREFERENCE') && !locationLocked && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-dark-400 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </label>
            </div>

            {/* Blocked period warning (shows when location triggers a location-specific block) */}
            {blockedDateWarning && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{blockedDateWarning}</span>
              </div>
            )}

            {/* Seating Area Selection */}
            <div className="form-group">
              <label className="label">Seating Area *</label>
              {seatingLocked && (
                <div className="mb-3 text-xs text-blue-400/80 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                  Seating is fixed to {seatingLocked === 'INSIDE' ? 'Inside' : 'Outside'} based on selected activities.
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {['INSIDE', 'OUTSIDE'].map((area) => (
                  <label
                    key={area}
                    className={`
                      relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200
                      ${seatingLocked && area !== seatingLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                      ${watch('seatingArea') === area
                        ? 'border-hubble-500 bg-hubble-500/10'
                        : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      {...register('seatingArea')}
                      value={area}
                      className="sr-only"
                      disabled={!!seatingLocked && area !== seatingLocked}
                    />
                    <span className="text-2xl mb-2">
                      {area === 'INSIDE' ? '🏠' : '☀️'}
                    </span>
                    <span className="text-sm font-medium text-white text-center">
                      {area === 'INSIDE' ? 'Inside' : 'Outside'}
                    </span>
                    {watch('seatingArea') === area && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-hubble-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </label>
                ))}
              </div>
              {errors.seatingArea && <p className="error-text">{errors.seatingArea.message}</p>}
              {/* Weather disclaimer */}
              {(watch('seatingArea') === 'INSIDE' || watch('seatingArea') === 'OUTSIDE') && (
                <div className="mt-3 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 space-y-1">
                  <p>⚠️ <span className="font-medium">Important location information:</span></p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-400/70">
                    <li>You cannot change your location after confirmation</li>
                    <li>Terrace reservations do not guarantee a spot inside in case of bad weather</li>
                    <li>Inside reservations do not replace outside reservations in case of good weather</li>
                    {watch('seatingArea') === 'OUTSIDE' && (
                      <li>Outside reservations only possible until 23:00</li>
                    )}
                    <li>We cannot hold tables if you are late or move to a different spot</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Additional remarks */}
            <div className="form-group">
              <label className="label">Additional Location/Seating Remarks (optional)</label>
              <input
                type="text"
                {...register('comments')}
                className="input-field"
                placeholder="e.g., Near the window, quiet corner..."
              />
            </div>
          </div>
        )}

        {/* Step 4: Payment */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-meteor-500/20">
                <CreditCard className="w-5 h-5 text-meteor-400" />
              </div>
              <div>
                <h2 className="text-xl font-title font-semibold text-white">Payment Information</h2>
                <p className="text-sm text-dark-400 font-light">How will you be paying?</p>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Payment Method *</label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { value: 'INDIVIDUAL', label: 'People pay individually', desc: 'Each guest pays for themselves' },
                  { value: 'ONE_PERSON', label: 'One person pays at the end', desc: 'A single person settles the bill' },
                  { value: 'INVOICE', label: 'Invoice (>50 euros only)', desc: 'Receive an invoice after the event' },
                ].map((option) => {
                  const selected = watchPaymentOption === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`
                        flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                        ${selected
                          ? 'border-meteor-500 bg-meteor-500/10'
                          : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        {...register('paymentOption')}
                        value={option.value}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        selected ? 'border-meteor-500 bg-meteor-500' : 'border-dark-600 bg-dark-800'
                      }`}>
                        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className={`text-sm font-medium ${selected ? 'text-meteor-300' : 'text-white'}`}>{option.label}</span>
                        <p className="text-xs text-dark-400 mt-0.5">{option.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              {errors.paymentOption && <p className="error-text">{errors.paymentOption.message}</p>}
            </div>

            {/* Invoice sub-type */}
            {watchPaymentOption === 'INVOICE' && (
              <div className="space-y-4 pl-4 border-l-2 border-meteor-500/30">
                <div className="form-group">
                  <label className="label">Invoice Type *</label>
                  <select {...register('invoiceType')} className="select-field" disabled={optionsLoading}>
                    <option value="">Select invoice type...</option>
                    {(formOptions?.invoiceTypes ?? [
                      { value: 'TUE', displayName: 'TU/e' },
                      { value: 'FONTYS', displayName: 'Fontys' },
                      { value: 'EXTERNAL', displayName: 'External' },
                    ]).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.displayName}</option>
                    ))}
                  </select>
                  {errors.invoiceType && <p className="error-text">{errors.invoiceType.message}</p>}
                </div>

                {/* TUE/FONTYS: Kostenplaats */}
                {(watchInvoiceType === 'TUE' || watchInvoiceType === 'FONTYS') && (
                  <div className="form-group">
                    <label className="label">Kostenplaats *</label>
                    <input
                      type="text"
                      {...register('costCenter')}
                      className="input-field"
                      placeholder="e.g., CC-12345"
                    />
                    {errors.costCenter && <p className="error-text">{errors.costCenter.message}</p>}
                  </div>
                )}

                {/* EXTERNAL: Company name, address, remarks */}
                {watchInvoiceType === 'EXTERNAL' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="label">Company Name *</label>
                      <input
                        type="text"
                        {...register('invoiceName')}
                        className="input-field"
                        placeholder="Company or organization name"
                      />
                      {errors.invoiceName && <p className="error-text">{errors.invoiceName.message}</p>}
                    </div>

                    <div className="form-group">
                      <label className="label">Invoice Address *</label>
                      <textarea
                        {...register('invoiceAddress')}
                        className="input-field min-h-[80px] resize-none"
                        placeholder="Full billing address..."
                      />
                      {errors.invoiceAddress && <p className="error-text">{errors.invoiceAddress.message}</p>}
                    </div>

                    <div className="form-group">
                      <label className="label">Invoice Remarks</label>
                      <textarea
                        {...register('invoiceRemarks')}
                        className="input-field min-h-[60px] resize-none"
                        placeholder="Any additional remarks for the invoice..."
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Summary & Confirmation */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-hubble-500/20">
                <ClipboardCheck className="w-5 h-5 text-hubble-400" />
              </div>
              <div>
                <h2 className="text-xl font-title font-semibold text-white">Review & Confirm</h2>
                <p className="text-sm text-dark-400 font-light">Please review your reservation details</p>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-4">
              {/* Contact */}
              <div className="bg-dark-800/50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-hubble-400 mb-3 uppercase tracking-wider">Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><span className="text-dark-400">Name:</span> <span className="text-white">{getValues('contactName')}</span></div>
                  <div><span className="text-dark-400">Email:</span> <span className="text-white">{getValues('email')}</span></div>
                  {getValues('phoneNumber') && <div><span className="text-dark-400">Phone:</span> <span className="text-white">{getValues('phoneNumber')}</span></div>}
                  {getValues('organizationName') && <div><span className="text-dark-400">Organization:</span> <span className="text-white">{getValues('organizationName')}</span></div>}
                </div>
              </div>

              {/* Event */}
              <div className="bg-dark-800/50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-meteor-400 mb-3 uppercase tracking-wider">Event</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><span className="text-dark-400">Title:</span> <span className="text-white">{getValues('eventTitle')}</span></div>
                  <div><span className="text-dark-400">Guests:</span> <span className="text-white">{getValues('expectedGuests')}</span></div>
                  <div><span className="text-dark-400">Date:</span> <span className="text-white">{getValues('eventDate')}</span></div>
                  <div><span className="text-dark-400">Time:</span> <span className="text-white">{getValues('startTime')} - {getValues('endTime')}</span></div>
                  {watchSpecialActivities.length > 0 && (
                    <div className="md:col-span-2">
                      <span className="text-dark-400">Activities:</span>{' '}
                      <span className="text-white">
                        {watchSpecialActivities.map(a => SPECIAL_ACTIVITY_LABELS[a] || a).join(', ')}
                      </span>
                    </div>
                  )}
                  {getValues('description') && (
                    <div className="md:col-span-2">
                      <span className="text-dark-400">Description:</span>{' '}
                      <span className="text-white">{getValues('description')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="bg-dark-800/50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-hubble-400 mb-3 uppercase tracking-wider">Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><span className="text-dark-400">Location:</span> <span className="text-white">{watchLocation || 'No Preference'}</span></div>
                  <div><span className="text-dark-400">Seating:</span> <span className="text-white">{watch('seatingArea') === 'INSIDE' ? 'Inside' : 'Outside'}</span></div>
                  {getValues('comments') && <div className="md:col-span-2"><span className="text-dark-400">Remarks:</span> <span className="text-white">{getValues('comments')}</span></div>}
                </div>
              </div>

              {/* Payment */}
              <div className="bg-dark-800/50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-meteor-400 mb-3 uppercase tracking-wider">Payment</h3>
                <div className="text-sm">
                  <span className="text-dark-400">Method:</span> <span className="text-white">{getPaymentLabel()}</span>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="bg-dark-800/50 rounded-xl p-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('termsAccepted')}
                  className="w-5 h-5 mt-0.5 rounded border-dark-600 bg-dark-700 text-hubble-500 focus:ring-hubble-500 focus:ring-offset-dark-900"
                />
                <div>
                  <div className="font-medium text-white">I accept the terms and conditions *</div>
                  <div className="text-sm text-dark-400">
                    By submitting this form, I understand this is a reservation request and not a
                    confirmation. I will receive a response within 72 hours.
                  </div>
                </div>
              </label>
              {errors.termsAccepted && <p className="error-text mt-2">{errors.termsAccepted.message}</p>}
            </div>

            {/* Submit Error */}
            {submitError && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400">
                {submitError}
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-dark-800">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${currentStep === 1
                ? 'opacity-0 pointer-events-none'
                : 'text-dark-300 hover:text-white hover:bg-dark-800'
              }
            `}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {currentStep < steps.length ? (
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary flex items-center gap-2"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || !!optionsError}
              className="btn-secondary flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Reservation
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
