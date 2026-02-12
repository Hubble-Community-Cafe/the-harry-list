import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User, Mail, Phone, Building2, Calendar, MapPin,
  CreditCard, UtensilsCrossed, MessageSquare, Send, Loader2,
  ChevronRight, ChevronLeft, Sparkles, Plus, Minus, CalendarDays
} from 'lucide-react';
import { submitReservation, fetchFormOptions } from '../lib/api';
import type { ReservationFormData } from '../types/reservation';

// Form option type from API
interface FormOption {
  value: string;
  label: string;
}

interface FormOptions {
  eventTypes: FormOption[];
  organizerTypes: FormOption[];
  paymentOptions: FormOption[];
  locations: FormOption[];
  seatingAreas: FormOption[];
  dietaryPreferences: FormOption[];
}

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
  description: z.string().optional(),
  eventType: z.string().min(1, 'Please select an event type'),
  organizerType: z.string().min(1, 'Please select an organizer type'),
  expectedGuests: z.number().min(8, 'Minimum reservation size is 8 people'),
  eventDate: z.string().min(1, 'Please select a date'),
  startTime: z.string().min(1, 'Please select a start time'),
  endTime: z.string().min(1, 'Please select an end time'),
  location: z.string().min(1, 'Please select a location'),
  seatingArea: z.string().optional(),
  specificArea: z.string().optional(),
  paymentOption: z.string().min(1, 'Please select a payment option'),
  costCenter: z.string().optional(),
  invoiceName: z.string().optional(),
  invoiceAddress: z.string().optional(),
  foodRequired: z.boolean().optional(),
  dietaryPreference: z.string().optional(),
  dietaryNotes: z.string().optional(),
  comments: z.string().optional(),
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms'),
}).superRefine((data, ctx) => {
  // Cost center is required when payment option is COST_CENTER
  if (data.paymentOption === 'COST_CENTER' && (!data.costCenter || data.costCenter.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Cost center is required for this payment method',
      path: ['costCenter'],
    });
  }

  // Invoice name and address are required when payment option is INVOICE
  if (data.paymentOption === 'INVOICE') {
    if (!data.invoiceName || data.invoiceName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invoice name is required for invoice payment',
        path: ['invoiceName'],
      });
    }
    if (!data.invoiceAddress || data.invoiceAddress.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invoice address is required for invoice payment',
        path: ['invoiceAddress'],
      });
    }
  }
});

interface ReservationFormProps {
  onSuccess: (result: any) => void;
}

const steps = [
  { id: 1, title: 'Contact', icon: User },
  { id: 2, title: 'Event', icon: Calendar },
  { id: 3, title: 'Location', icon: MapPin },
  { id: 4, title: 'Payment', icon: CreditCard },
  { id: 5, title: 'Extras', icon: UtensilsCrossed },
];

export function ReservationForm({ onSuccess }: ReservationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formOptions, setFormOptions] = useState<FormOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // Fetch form options from API on mount
  useEffect(() => {
    async function loadOptions() {
      try {
        const options = await fetchFormOptions();
        setFormOptions(options);
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
    formState: { errors },
  } = useForm<ReservationFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      foodRequired: false,
      termsAccepted: false,
      expectedGuests: 8,
    },
  });

  const watchLocation = watch('location');
  const watchFoodRequired = watch('foodRequired');
  const watchPaymentOption = watch('paymentOption');

  const validateStep = async (step: number) => {
    // Build step 4 fields dynamically based on payment option
    let step4Fields: (keyof ReservationFormData)[] = ['paymentOption'];
    if (watchPaymentOption === 'COST_CENTER') {
      step4Fields.push('costCenter');
    } else if (watchPaymentOption === 'INVOICE') {
      step4Fields.push('invoiceName', 'invoiceAddress');
    }

    const fieldsToValidate: (keyof ReservationFormData)[][] = [
      ['contactName', 'email', 'phoneNumber'], // Step 1
      ['eventTitle', 'eventType', 'organizerType', 'expectedGuests', 'eventDate', 'startTime', 'endTime'], // Step 2
      ['location'], // Step 3
      step4Fields, // Step 4 - dynamic based on payment option
      ['termsAccepted'], // Step 5
    ];

    const result = await trigger(fieldsToValidate[step - 1]);
    return result;
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: ReservationFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitReservation(data);
      onSuccess(result);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit reservation');
    } finally {
      setIsSubmitting(false);
    }
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
      <form onSubmit={handleSubmit(onSubmit)} className="card animate-fade-in">
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
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
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
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
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
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
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
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
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

        {/* Step 2: Event Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-meteor-500/20">
                <Calendar className="w-5 h-5 text-meteor-400" />
              </div>
              <div>
                <h2 className="text-xl font-title font-semibold text-white">Event Details</h2>
                <p className="text-sm text-dark-400 font-light">Tell us about your event</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div className="form-group">
                <label className="label">Event Type *</label>
                <select {...register('eventType')} className="select-field" disabled={optionsLoading}>
                  <option value="">Select event type...</option>
                  {formOptions?.eventTypes.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.eventType && <p className="error-text">{errors.eventType.message}</p>}
              </div>

              <div className="form-group">
                <label className="label">Organizer Type *</label>
                <select {...register('organizerType')} className="select-field" disabled={optionsLoading}>
                  <option value="">Select organizer type...</option>
                  {formOptions?.organizerTypes.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.organizerType && <p className="error-text">{errors.organizerType.message}</p>}
              </div>

              <div className="form-group">
                <label className="label">Expected Number of Guests *</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const current = watch('expectedGuests') || 8;
                      if (current > 8) setValue('expectedGuests', current - 1);
                    }}
                    className="w-12 h-12 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400 hover:text-white hover:bg-dark-700 hover:border-hubble-500 transition-all disabled:opacity-50"
                    disabled={watch('expectedGuests') <= 8}
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      {...register('expectedGuests', { valueAsNumber: true })}
                      className="input-field text-center text-xl font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min="8"
                      placeholder="50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const current = watch('expectedGuests') || 8;
                      setValue('expectedGuests', current + 1);
                    }}
                    className="w-12 h-12 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400 hover:text-white hover:bg-dark-700 hover:border-hubble-500 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                {errors.expectedGuests && <p className="error-text">{errors.expectedGuests.message}</p>}
                {/* Guest count constraints */}
                <div className="mt-2 text-xs text-dark-400 space-y-1">
                  <p>• Minimum reservation size: <span className="text-white">8 people</span></p>
                  <p>• Maximum with food: <span className="text-white">70 people</span></p>
                  <p>• Maximum drinks only: <span className="text-white">95 people</span></p>
                  <p>• Minimum on Sundays: <span className="text-white">40 people</span></p>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Event Date *</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" />
                  <input
                    type="date"
                    {...register('eventDate')}
                    className="input-field pl-10 pr-4 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                {errors.eventDate && <p className="error-text">{errors.eventDate.message}</p>}
              </div>

              <div className="form-group">
                <label className="label">Start Time *</label>
                <select {...register('startTime')} className="select-field">
                  <option value="">Select start time...</option>
                  {(() => {
                    // Start times: 12:00 to 01:00 (next day)
                    const times = [];
                    for (let hour = 12; hour <= 23; hour++) {
                      times.push(`${hour.toString().padStart(2, '0')}:00`);
                      times.push(`${hour.toString().padStart(2, '0')}:30`);
                    }
                    // 00:00, 00:30, 01:00
                    times.push('00:00', '00:30', '01:00');
                    return times.map(time => <option key={time} value={time}>{time}</option>);
                  })()}
                </select>
                {errors.startTime && <p className="error-text">{errors.startTime.message}</p>}
                {/* Dinner warning for late start times */}
                {(() => {
                  const startTime = watch('startTime');
                  if (startTime) {
                    const [h, m] = startTime.split(':').map(Number);
                    // Treat times from 19:31 to 01:00 (inclusive) as after 19:30
                    // 19:30 = 1170 minutes, 01:00 = 60 minutes
                    // If hour >= 20 or hour < 2, always show warning
                    if ((h > 19) || (h < 2) || (h === 19 && m >= 30)) {
                      return (
                        <div className="mt-2 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                          <p>⚠️ <span className="font-medium">Note:</span> Reservations starting after 19:30 cannot include dinner/food, only snacks.</p>
                        </div>
                      );
                    }
                  }
                  return null;
                })()}
              </div>

              <div className="form-group">
                <label className="label">End Time *</label>
                <select {...register('endTime')} className="select-field">
                  <option value="">Select end time...</option>
                  {(() => {
                    // End times: 12:30 to 02:00 (next day)
                    const times = [];
                    for (let hour = 12; hour <= 23; hour++) {
                      times.push(`${hour.toString().padStart(2, '0')}:30`);
                    }
                    // 00:00, 00:30, 01:00, 01:30, 02:00
                    times.push('00:00', '00:30', '01:00', '01:30', '02:00');
                    return times.map(time => <option key={time} value={time}>{time}</option>);
                  })()}
                </select>
                {errors.endTime && <p className="error-text">{errors.endTime.message}</p>}
              </div>

              <div className="form-group md:col-span-2">
                <label className="label">Event Description</label>
                <textarea
                  {...register('description')}
                  className="input-field min-h-[100px] resize-none"
                  placeholder="Tell us more about your event..."
                />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`
                relative flex flex-col p-6 rounded-xl border-2 cursor-pointer transition-all duration-200
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
                />
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-hubble-600 to-hubble-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Hubble</div>
                    <div className="text-xs text-dark-400">Community Café</div>
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

              <label className={`
                relative flex flex-col p-6 rounded-xl border-2 cursor-pointer transition-all duration-200
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
                />
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-meteor-600 to-meteor-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Meteor</div>
                    <div className="text-xs text-dark-400">Community Café</div>
                  </div>
                </div>
                <p className="text-sm text-dark-400">
                  The new and modern Meteor, which includes a bear instead of a duck ;). (this is the only location that support private events)
                </p>
                {watchLocation === 'METEOR' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-meteor-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </label>
            </div>
            {errors.location && <p className="error-text">{errors.location.message}</p>}

            {/* Seating Area Selection */}
            <div className="form-group">
              <label className="label">Seating Preference</label>
              <div className="grid grid-cols-3 gap-3">
                {(formOptions?.seatingAreas || []).map((option) => (
                  <label
                    key={option.value}
                    className={`
                      relative flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                      ${watch('seatingArea') === option.value
                        ? 'border-hubble-500 bg-hubble-500/10'
                        : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      {...register('seatingArea')}
                      value={option.value}
                      className="sr-only"
                    />
                    <span className="text-2xl mb-2">
                      {option.value === 'INSIDE' ? '🏠' : option.value === 'OUTSIDE' ? '☀️' : '✨'}
                    </span>
                    <span className="text-sm font-medium text-white text-center">{option.label}</span>
                    {watch('seatingArea') === option.value && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-hubble-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </label>
                ))}
              </div>
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

            <div className="form-group">
              <label className="label">Additional Location Notes (optional)</label>
              <input
                type="text"
                {...register('specificArea')}
                className="input-field"
                placeholder="e.g., Near the window, private corner..."
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
              <select {...register('paymentOption')} className="select-field" disabled={optionsLoading}>
                <option value="">Select payment method...</option>
                {formOptions?.paymentOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errors.paymentOption && <p className="error-text">{errors.paymentOption.message}</p>}
            </div>

            {/* Cost Center - only for Kostenplaats */}
            {watch('paymentOption') === 'COST_CENTER' && (
              <div className="form-group">
                <label className="label">Cost Center *</label>
                <input
                  type="text"
                  {...register('costCenter')}
                  className="input-field"
                  placeholder="e.g., CC-12345"
                />
                {errors.costCenter && <p className="error-text">{errors.costCenter.message}</p>}
              </div>
            )}

            {/* Invoice fields - only for Invoice payment method */}
            {watch('paymentOption') === 'INVOICE' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                  <label className="label">Invoice Name *</label>
                  <input
                    type="text"
                    {...register('invoiceName')}
                    className="input-field"
                    placeholder="Company or organization name"
                  />
                  {errors.invoiceName && <p className="error-text">{errors.invoiceName.message}</p>}
                </div>

                <div className="form-group md:col-span-2">
                  <label className="label">Invoice Address *</label>
                  <textarea
                    {...register('invoiceAddress')}
                    className="input-field min-h-[80px] resize-none"
                    placeholder="Full billing address..."
                  />
                  {errors.invoiceAddress && <p className="error-text">{errors.invoiceAddress.message}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Extras & Submit */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-hubble-500/20">
                <UtensilsCrossed className="w-5 h-5 text-hubble-400" />
              </div>
              <div>
                <h2 className="text-xl font-title font-semibold text-white">Extras & Confirmation</h2>
                <p className="text-sm text-dark-400 font-light">Any special requirements?</p>
              </div>
            </div>

            {/* Food Section */}
            <div className="bg-dark-800/50 rounded-xl p-5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('foodRequired')}
                  className="w-5 h-5 rounded border-dark-600 bg-dark-700 text-hubble-500 focus:ring-hubble-500 focus:ring-offset-dark-900"
                />
                <div>
                  <div className="font-medium text-white">Food Required</div>
                  <div className="text-sm text-dark-400">Check if you need catering for your event</div>
                </div>
              </label>

              {watchFoodRequired && (
                <div className="mt-4 pt-4 border-t border-dark-700 space-y-4">
                  {/* Food constraints note */}
                  <div className="text-xs text-dark-400 bg-dark-700/50 rounded-lg p-3 space-y-1">
                    <p>• Maximum guests with food: <span className="text-white">70 people</span></p>
                    <p>• For dinner reservations with <span className="text-white">10+ people</span>, please indicate dinner choices in the notes below</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="label">Dietary Preference</label>
                      <select {...register('dietaryPreference')} className="select-field" disabled={optionsLoading}>
                        <option value="">No preference</option>
                        {formOptions?.dietaryPreferences.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="label">Dietary Notes</label>
                      <input
                        type="text"
                        {...register('dietaryNotes')}
                        className="input-field"
                        placeholder="Allergies, restrictions, etc."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="form-group">
              <label className="label flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Additional Comments
              </label>
              <textarea
                {...register('comments')}
                className="input-field min-h-[100px] resize-none"
                placeholder="Any other information we should know..."
              />
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
              disabled={isSubmitting}
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

