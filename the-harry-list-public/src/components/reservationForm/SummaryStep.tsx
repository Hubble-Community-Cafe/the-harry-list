import { Suspense } from 'react';
import { useFormContext } from 'react-hook-form';
import { fieldA11y } from './fieldA11y';
import { FieldError } from './FieldError';
import { ClipboardCheck, AlertTriangle } from 'lucide-react';
import { getAltchaChallengeUrl } from '../../lib/api';
import { AltchaWidget } from '../../lib/deferredChunks';
import { REPLY_TIME } from '../../lib/replyTime';
import { SPECIAL_ACTIVITY_LABELS, locationLabel } from './labels';
import { formatEventDate } from '../../lib/formatDate';
import type { ReservationFormData } from '../../types/reservation';

interface SummaryStepProps {
  activityNotices: { id: number; message: string }[];
  submitError: string | null;
  setAltchaPayload: (payload: string | null) => void;
  onOpenPrivacy: () => void;
}

/** Step 4 of the reservation form: the summary, terms and bot check before submitting. */
export function SummaryStep({ activityNotices, submitError, setAltchaPayload, onOpenPrivacy }: SummaryStepProps) {
  const { register, watch, getValues, formState: { errors } } = useFormContext<ReservationFormData>();
  const watchLocation = watch('location');
  const watchSpecialActivities = watch('specialActivities') || [];
  const watchPaymentOption = watch('paymentOption');
  const watchInvoiceType = watch('invoiceType');

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
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-hubble-500/20">
              <ClipboardCheck className="w-5 h-5 text-hubble-400" />
            </div>
            <div>
              <h2 tabIndex={-1} className="text-xl font-title font-semibold text-white tracking-tight outline-none">Review & Confirm</h2>
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
                <div><span className="text-dark-400">Date:</span> <span className="text-white">{formatEventDate(getValues('eventDate'))}</span></div>
                <div><span className="text-dark-400">Time:</span> <span className="text-white">{getValues('startTime')} - {getValues('endTime')}</span></div>
                {watchSpecialActivities.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="text-dark-400">Activities:</span>{' '}
                    <span className="text-white">
                      {watchSpecialActivities.map(a => SPECIAL_ACTIVITY_LABELS[a] || a).join(', ')}
                    </span>
                  </div>
                )}
                {/* Repeat any activity notices here so they are still in front of the
                    guest at the point of submitting, not just when they picked the activity. */}
                {activityNotices.length > 0 && (
                  <div className="md:col-span-2 space-y-2 mt-1" data-testid="summary-activity-notices">
                    {activityNotices.map(notice => (
                      <div
                        key={notice.id}
                        data-testid="summary-activity-notice"
                        className="text-xs border rounded-lg px-3 py-2 flex items-start gap-2 notice-warning"
                      >
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{notice.message}</span>
                      </div>
                    ))}
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
                <div><span className="text-dark-400">Location:</span> <span className="text-white">{locationLabel(watchLocation)}</span></div>
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
                data-testid="terms-accepted"
                {...fieldA11y(errors, 'termsAccepted')}
                className="w-5 h-5 mt-0.5 rounded border-dark-600 bg-dark-700 text-hubble-500 focus:ring-hubble-500 focus:ring-offset-dark-900"
              />
              <div>
                <div className="font-medium text-white">I accept the terms and conditions *</div>
                <div className="text-sm text-dark-400">
                  By submitting this form, I understand this is a reservation request and not a
                  confirmation. {REPLY_TIME}
                </div>
              </div>
            </label>
            <FieldError errors={errors} name="termsAccepted" className="mt-2" />
            <p className="text-xs text-dark-500 mt-3">
              We use the details you provide only to handle your reservation. See our{' '}
              <button
                type="button"
                onClick={onOpenPrivacy}
                data-testid="form-privacy-link"
                className="underline text-hubble-400 hover:text-hubble-300 transition-colors"
              >
                Privacy Policy
              </button>
              {' '}for how we handle your data.
            </p>
          </div>

          {/* ALTCHA proof-of-work widget (loaded on demand; normally prefetched long before step 4) */}
          <Suspense fallback={null}>
            <AltchaWidget
              challengeUrl={getAltchaChallengeUrl()}
              onVerified={setAltchaPayload}
            />
          </Suspense>

          {/* Submit Error */}
          {submitError && (
            <div className="border rounded-xl p-4 notice-error">
              {submitError}
            </div>
          )}
        </div>
  );
}
