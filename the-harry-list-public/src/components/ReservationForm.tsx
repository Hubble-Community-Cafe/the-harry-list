import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  User, Calendar, CreditCard, Send, Loader2, ChevronRight, ChevronLeft, ClipboardCheck, AlertTriangle,
} from 'lucide-react';
import * as Sentry from '@sentry/react';
import { submitReservation, fetchFormOptions, fetchFormConstraints, fetchBlockedPeriods } from '../lib/api';
import { ActivityNoticeDialog } from './ActivityNoticeDialog';
import { checkBlockedDate } from '../lib/blockedPeriods';
import { noticeApplies, requiresConfirmation } from '../lib/activityNotices';
import { useRestoreAfterLock } from '../lib/useRestoreAfterLock';
import { REPLY_TIME, SHORT_NOTICE } from '../lib/replyTime';
import type { ReservationFormData, FormOptions, FormConstraint, BlockedPeriod } from '../types/reservation';
import { formSchema } from './reservationForm/schema';
import { ContactStep } from './reservationForm/ContactStep';
import { StepProgress, type FormStep } from './reservationForm/StepProgress';
import { DetailsStep } from './reservationForm/DetailsStep';
import { PaymentStep } from './reservationForm/PaymentStep';
import { SummaryStep } from './reservationForm/SummaryStep';
import { evaluateFormRules, isActivityBlocked as isActivityBlockedBy, minBookingDate } from '../lib/formRules';

// Phone number validation - allows international formats
interface ReservationResult {
  confirmationNumber: string;
  eventTitle: string;
  contactName: string;
  email: string;
}

interface ReservationFormProps {
  onSuccess: (result: ReservationResult) => void;
  onOpenPrivacy: () => void;
}

const steps: FormStep[] = [
  { id: 1, title: 'Contact', icon: User },
  { id: 2, title: 'Details', icon: Calendar },
  { id: 3, title: 'Payment', icon: CreditCard },
  { id: 4, title: 'Confirm', icon: ClipboardCheck },
];

export function ReservationForm({ onSuccess, onOpenPrivacy }: ReservationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formOptions, setFormOptions] = useState<FormOptions | null>(null);
  const [constraints, setConstraints] = useState<FormConstraint[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [altchaPayload, setAltchaPayload] = useState<string | null>(null);

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
        Sentry.captureException(error);
      } finally {
        setOptionsLoading(false);
      }
    }
    loadOptions();
  }, []);

  const form = useForm<ReservationFormData>({
    resolver: zodResolver(formSchema),
    // Validate a field once the guest has left it (and on every change after),
    // so problems surface before they press Continue rather than only after.
    mode: 'onTouched',
    defaultValues: {
      termsAccepted: false,
      expectedGuests: 8,
      specialActivities: [],
    },
  });
  const { handleSubmit, watch, trigger, setValue, setFocus, getValues, formState: { errors } } = form;

  const watchLocation = watch('location');
  const watchPaymentOption = watch('paymentOption');
  const watchInvoiceType = watch('invoiceType');
  const watchSpecialActivitiesRaw = watch('specialActivities');
  const watchSpecialActivities = useMemo(() => watchSpecialActivitiesRaw || [], [watchSpecialActivitiesRaw]);
  const watchStartTime = watch('startTime');
  const watchEndTime = watch('endTime');
  const watchExpectedGuests = watch('expectedGuests');

  // The form's rules (locks, limits, time slots) as plain values; see lib/formRules.
  const rules = useMemo(() => evaluateFormRules(constraints, {
    activities: watchSpecialActivities,
    guests: watchExpectedGuests,
    location: watchLocation,
    startTime: watchStartTime,
    endTime: watchEndTime,
  }), [constraints, watchSpecialActivities, watchExpectedGuests, watchLocation, watchStartTime, watchEndTime]);
  const { locationLock: locationLocked, locationConflict, seatingLock: seatingLocked, guestLimitWarning, advanceBookingDays, activityConflicts } = rules;

  // Auto-set location when locked, and give the guest their own choice back once the lock
  // lifts. Otherwise typing "12" guests passes through "1", flips a Hubble booking to Meteor
  // and silently leaves it there.
  useRestoreAfterLock('location', locationLocked, getValues, setValue);

  // Auto-set seating area when locked, and restore the guest's choice when the activity goes.
  useRestoreAfterLock('seatingArea', seatingLocked, getValues, setValue);

  // Advisory notices (e.g. "this option costs money") shown when a selected activity
  // matches an ACTIVITY_NOTICE constraint, optionally only for one location and/or from a
  // minimum group size. Purely informational, no enforcement.
  const activityNotices = useMemo(() => {
    const ctx = { activities: watchSpecialActivities, location: watchLocation, guests: watchExpectedGuests };
    return constraints
      .filter(c => noticeApplies(c, ctx))
      .map(c => ({ id: c.id, message: c.message }));
  }, [constraints, watchSpecialActivities, watchLocation, watchExpectedGuests]);

  // A notice staff marked as requiring acknowledgement opens a dialog. Holds the notice and
  // its activity while the guest decides; the activity may or may not be selected yet.
  const [pendingNotice, setPendingNotice] = useState<{ id: number; activity: string; message: string } | null>(null);
  // Confirm-required notices the guest already acknowledged, so they are not asked twice.
  // Deselecting the activity forgets them again.
  const [acknowledgedNotices, setAcknowledgedNotices] = useState<number[]>([]);

  /** The unacknowledged confirm-required notice for an activity, if the form now meets its conditions. */
  const confirmNoticeFor = useCallback((activity: string) => {
    const ctx = { activities: [activity], location: watchLocation, guests: watchExpectedGuests };
    return constraints.find(c =>
      requiresConfirmation(c) && noticeApplies(c, ctx) && !acknowledgedNotices.includes(c.id));
  }, [constraints, watchLocation, watchExpectedGuests, acknowledgedNotices]);

  // A conditional notice (e.g. Meteor with 8+ guests) can start to apply after its activity
  // was picked, when the guest changes the location or group size. Ask for it then.
  useEffect(() => {
    if (pendingNotice) return;
    for (const activity of watchSpecialActivities) {
      const notice = confirmNoticeFor(activity);
      if (notice) {
        setPendingNotice({ id: notice.id, activity, message: notice.message });
        return;
      }
    }
  }, [pendingNotice, watchSpecialActivities, confirmNoticeFor]);

  // Blocked period check for selected date
  const watchEventDate = watch('eventDate');
  const blockedDateInfo = useMemo(
    () => checkBlockedDate(watchEventDate, watchLocation, blockedPeriods, watchStartTime),
    [watchEventDate, blockedPeriods, watchLocation, watchStartTime]
  );

  // A soft block is informational: the guest can proceed after acknowledging it.
  const [softBlockAcknowledged, setSoftBlockAcknowledged] = useState(false);
  // Set when the guest tries to continue without acknowledging, so we can prompt them.
  const [softBlockAckError, setSoftBlockAckError] = useState(false);
  // Reset state whenever the matched (soft) block changes.
  useEffect(() => {
    setSoftBlockAcknowledged(false);
    setSoftBlockAckError(false);
  }, [blockedDateInfo?.message, blockedDateInfo?.soft]);

  // Bring the new step into view. The merged details step is long, so without
  // this a guest pressing Continue near the bottom lands mid-way down the next
  // step with its heading off-screen.
  const formRef = useRef<HTMLFormElement>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    formRef.current?.scrollIntoView({
      behavior: prefersReduced ? 'auto' : 'smooth',
      block: 'start',
    });
    // Move focus to the new step's heading so screen readers announce the step change
    // (otherwise focus stays on Continue and nothing tells them the page moved on).
    formRef.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }, [currentStep]);

  // Notice rendered wherever a blocked period applies. Hard blocks show a red,
  // blocking error; soft blocks show an amber warning with an acknowledgement checkbox.
  const blockedDateNotice = !blockedDateInfo ? null : blockedDateInfo.soft ? (
    <div data-testid="blocked-date-notice" data-soft="true" className="mt-2 text-xs border rounded-lg px-3 py-2 space-y-2 notice-warning">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{blockedDateInfo.message}</span>
      </div>
      <label className={`flex items-start gap-2 cursor-pointer rounded-md p-1 -m-1 ${softBlockAckError ? 'notice-error border' : ''}`}>
        <input
          type="checkbox"
          id="soft-block-ack"
          data-testid="soft-block-ack"
          aria-invalid={softBlockAckError || undefined}
          aria-describedby={softBlockAckError ? 'soft-block-ack-error' : undefined}
          checked={softBlockAcknowledged}
          onChange={e => {
            setSoftBlockAcknowledged(e.target.checked);
            if (e.target.checked) setSoftBlockAckError(false);
          }}
          className="mt-0.5 shrink-0"
        />
        <span>{blockedDateInfo.acknowledgementText}</span>
      </label>
      {softBlockAckError && (
        <p id="soft-block-ack-error" role="alert" data-testid="soft-block-ack-error" className="notice-text-error font-medium">Please tick the box above to confirm before continuing.</p>
      )}
    </div>
  ) : (
    <div id="blocked-date-notice" role="alert" tabIndex={-1} data-testid="blocked-date-notice" data-soft="false" className="mt-2 outline-none text-xs border rounded-lg px-3 py-2 flex items-start gap-2 notice-error">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{blockedDateInfo.message}</span>
    </div>
  );

  const minDateForBooking = useMemo(() => minBookingDate(advanceBookingDays), [advanceBookingDays]);

  const focusById = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
  };

  /** True when the step is valid; 'blocked' when a rule notice stopped it (and has focus). */
  const validateStep = async (step: number): Promise<boolean | 'blocked'> => {
    const paymentFields: (keyof ReservationFormData)[] = ['paymentOption'];
    if (watchPaymentOption === 'INVOICE') {
      paymentFields.push('invoiceType');
      if (watchInvoiceType === 'TUE' || watchInvoiceType === 'FONTYS') {
        paymentFields.push('costCenter');
      } else if (watchInvoiceType === 'EXTERNAL') {
        paymentFields.push('invoiceName', 'invoiceAddress');
      }
    }

    // Step 2 now merges the former Activity and Location steps, so it validates both the
    // event fields and the (required) seating area in one go. Location stays optional.
    const fieldsToValidate: (keyof ReservationFormData)[][] = [
      ['contactName', 'email', 'phoneNumber'], // Step 1: Contact
      ['eventTitle', 'description', 'expectedGuests', 'eventDate', 'startTime', 'endTime', 'longReservationReason', 'seatingArea'], // Step 2: Details
      paymentFields, // Step 3: Payment
      ['termsAccepted'], // Step 4: Confirm
    ];

    // The rules below block step 2 with a notice instead of a field error. Bring that notice
    // into view and focus it, so the guest (also on a phone, or with a screen reader) learns
    // why Continue did nothing.

    // Block step 2 advance if guest limit constraint violated
    if (step === 2 && guestLimitWarning) {
      focusById('guest-limit-notice');
      return 'blocked';
    }

    // Block step 2 advance if guest count conflicts with activity location lock
    if (step === 2 && locationConflict) {
      focusById('location-conflict-notice');
      return 'blocked';
    }

    // Block advance if date/location is in a blocked period (all on the merged step 2 now).
    // Hard blocks always prevent advancing; soft blocks only until the guest acknowledges the warning.
    if (step === 2 && blockedDateInfo) {
      if (!blockedDateInfo.soft) {
        focusById('blocked-date-notice');
        return 'blocked';
      }
      if (!softBlockAcknowledged) {
        setSoftBlockAckError(true);
        focusById('soft-block-ack');
        return 'blocked';
      }
    }

    // Block step 2 advance if long reservation reason is missing
    if (step === 2 && rules.needsLongReservationReason && !getValues('longReservationReason')?.trim()) {
      await trigger('longReservationReason');
      markTouched(['longReservationReason']);
      return false;
    }

    const fields = fieldsToValidate[step - 1];
    const result = await trigger(fields);
    if (!result) markTouched(fields);
    return result;
  };

  // In 'onTouched' mode a field only re-validates while typing once it has been left.
  // A field that failed on Continue was often never left, so its error would only clear
  // on blur: as the guest clicks Continue, the error line vanishes, the button jumps up
  // mid-click and the click is lost. Marking the fields touched clears errors as they type.
  const markTouched = (fields: (keyof ReservationFormData)[]) => {
    for (const field of fields) {
      if (form.getFieldState(field).error) {
        setValue(field, getValues(field), { shouldTouch: true });
      }
    }
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid === 'blocked') return; // the rule's notice already has focus
    if (isValid && currentStep < steps.length) {
      setSubmitError(null);
      setCurrentStep(currentStep + 1);
      return;
    }
    // Validation failed: move focus to the first field with an error so
    // keyboard and screen-reader users are told what needs fixing.
    const firstError = Object.keys(errors)[0] as keyof ReservationFormData | undefined;
    if (firstError) {
      setFocus(firstError);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setSubmitError(null);
      setCurrentStep(currentStep - 1);
    }
  };

  const isActivityBlocked = (activity: string, current: string[]): boolean =>
    isActivityBlockedBy(activityConflicts, activity, current);

  const selectActivity = (activity: string) => {
    const current = getValues('specialActivities') || [];
    if (!current.includes(activity)) {
      setValue('specialActivities', [...current, activity]);
    }
  };

  const deselectActivity = (activity: string) => {
    const current = getValues('specialActivities') || [];
    setValue('specialActivities', current.filter(a => a !== activity));
    setAcknowledgedNotices(prev => prev.filter(id =>
      constraints.find(c => c.id === id)?.triggerActivity !== activity));
  };

  const toggleActivity = (activity: string) => {
    const current = getValues('specialActivities') || [];
    if (current.includes(activity)) {
      // Deselecting never prompts; any locks this activity triggered unwind with it.
      deselectActivity(activity);
      return;
    }
    if (isActivityBlocked(activity, current)) return;

    // Selecting an activity whose notice demands acknowledgement defers the change until
    // the guest answers the dialog, so declining leaves the form exactly as it was.
    const notice = confirmNoticeFor(activity);
    if (notice) {
      setPendingNotice({ id: notice.id, activity, message: notice.message });
      return;
    }
    selectActivity(activity);
  };

  const onSubmit = useCallback(async (data: ReservationFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitReservation(data, altchaPayload ?? undefined);
      onSuccess(result);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit reservation');
    } finally {
      setIsSubmitting(false);
    }
  }, [altchaPayload, onSuccess]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Important Notes Banner - Only on first step */}
      {currentStep === 1 && (
        <div className="mb-6 bg-dark-800/80 border border-dark-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span className="text-lg">📋</span> Please note
          </h3>
          <ul className="text-xs text-dark-300 space-y-1.5">
            <li>• This is a <span className="text-white font-medium">request form</span>: there are no obligations for you or us</li>
            <li>• {REPLY_TIME} {SHORT_NOTICE}</li>
            <li>• If you want to come in today, just walk in: we always save spots for walk-in guests</li>
            <li>• Please don't call about reservations, as we don't handle them by phone</li>
          </ul>
        </div>
      )}

      {/* Options Loading Error */}
      {optionsError && (
        <div className="mb-6 border rounded-xl p-4 text-center notice-error">
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

      <StepProgress steps={steps} currentStep={currentStep} onGoBack={setCurrentStep} />

      {/* Form Card */}
      <FormProvider {...form}>
      <form ref={formRef} noValidate onSubmit={handleSubmit(onSubmit, (fieldErrors) => {
        if (import.meta.env.DEV) console.error('Form validation failed on submit:', fieldErrors);
        const stepFields: (keyof ReservationFormData)[][] = [
          ['contactName', 'email', 'phoneNumber'],
          ['eventTitle', 'description', 'expectedGuests', 'eventDate', 'startTime', 'endTime', 'longReservationReason', 'location', 'seatingArea'],
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
      })} className="card">
        {/* Keyed on currentStep so React remounts this wrapper on every step
            change, replaying the entrance animation. The navigation buttons
            sit outside it deliberately: they are persistent chrome. */}
        <div key={currentStep} className="animate-step">
        {/* Step 1: Contact Information */}
        {currentStep === 1 && <ContactStep />}

        {/* Step 2: Activity Details */}
        {currentStep === 2 && (
          <DetailsStep
            formOptions={formOptions}
            constraints={constraints}
            rules={rules}
            activityNotices={activityNotices}
            blockedDateInfo={blockedDateInfo}
            blockedDateNotice={blockedDateNotice}
            minDateForBooking={minDateForBooking}
            isActivityBlocked={isActivityBlocked}
            toggleActivity={toggleActivity}
          />
        )}

        {/* Step 3: Payment */}
        {currentStep === 3 && <PaymentStep formOptions={formOptions} optionsLoading={optionsLoading} />}

        {/* Step 4: Summary & Confirmation */}
        {currentStep === 4 && (
          <SummaryStep
            activityNotices={activityNotices}
            submitError={submitError}
            setAltchaPayload={setAltchaPayload}
            onOpenPrivacy={onOpenPrivacy}
          />
        )}

        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-dark-800">
          <button
            type="button"
            aria-label="Back to previous step"
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

          {/* Distinct keys keep React from reusing the Continue button as the Submit button.
              Reused, it turns into type="submit" during the click that opens the last step,
              and the browser then submits the form (showing "You must accept the terms"). */}
          {currentStep < steps.length ? (
            <button
              key="continue"
              type="button"
              onClick={nextStep}
              className="btn-primary flex items-center gap-2"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              key="submit"
              type="submit"
              data-testid="submit-reservation"
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
                  Submit reservation
                </>
              )}
            </button>
          )}
        </div>
      </form>
      </FormProvider>

      {/* Acknowledgement dialog for notices staff marked as confirmation-required.
          Declining (or dismissing) leaves the activity unselected. */}
      <ActivityNoticeDialog
        message={pendingNotice?.message ?? null}
        onConfirm={() => {
          if (pendingNotice) {
            const { id } = pendingNotice;
            setAcknowledgedNotices(prev => [...prev, id]);
            selectActivity(pendingNotice.activity);
          }
          setPendingNotice(null);
        }}
        onDecline={() => {
          if (pendingNotice) deselectActivity(pendingNotice.activity);
          setPendingNotice(null);
        }}
      />
    </div>
  );
}
