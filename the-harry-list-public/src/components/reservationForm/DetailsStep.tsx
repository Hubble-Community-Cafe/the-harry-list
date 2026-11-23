import { useFormContext } from 'react-hook-form';
import { fieldA11y } from './fieldA11y';
import { FieldError } from './FieldError';
import { Calendar, MapPin, Plus, Minus, CalendarDays, AlertTriangle } from 'lucide-react';
import { MAX_LENGTH } from '../../lib/fieldLimits';
import { SPECIAL_ACTIVITY_LABELS, SPECIAL_ACTIVITY_DESCRIPTIONS } from './labels';
import type { ReactNode } from 'react';
import type { FormConstraint, FormOptions, ReservationFormData } from '../../types/reservation';
import type { FormRules } from '../../lib/formRules';
import type { BlockedDateMatch } from '../../lib/blockedPeriods';

interface DetailsStepProps {
  formOptions: FormOptions | null;
  constraints: FormConstraint[];
  rules: FormRules;
  activityNotices: { id: number; message: string }[];
  blockedDateInfo: BlockedDateMatch | null;
  /** The blocked-date warning, shown next to the date or next to the location. */
  blockedDateNotice: ReactNode;
  minDateForBooking: string;
  isActivityBlocked: (activity: string, selected: string[]) => boolean;
  toggleActivity: (activity: string) => void;
}

/** Step 2 of the reservation form: the event, its date and time, and where to sit. */
export function DetailsStep({ formOptions, constraints, rules, activityNotices, blockedDateInfo, blockedDateNotice, minDateForBooking, isActivityBlocked, toggleActivity }: DetailsStepProps) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<ReservationFormData>();
  const {
    locationLock: locationLocked, locationConflict, seatingLock: seatingLocked, guestLimitWarning, minGuests,
    advanceBookingDays, startTimes, endTimes, startTimeWarning, durationMinutes,
  } = rules;
  const requiresAdvanceBooking = advanceBookingDays > 0;
  const watchLocation = watch('location');
  const watchExpectedGuests = watch('expectedGuests');
  const watchSpecialActivities = watch('specialActivities') || [];

  return (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-meteor-500/20">
              <Calendar className="w-5 h-5 text-meteor-400" />
            </div>
            <div>
              <h2 tabIndex={-1} className="text-xl font-title font-semibold text-white tracking-tight outline-none">Event Details</h2>
              <p className="text-sm text-dark-400 font-light">Tell us about your event and where to host it</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Event Title */}
            <div className="form-group md:col-span-2">
              <label htmlFor="eventTitle" className="label">Event Title *</label>
              <input
                type="text"
                {...register('eventTitle')} maxLength={MAX_LENGTH.eventTitle} id="eventTitle"
                data-testid="event-title"
                className="input-field"
                placeholder="Annual Association Drinks"
                {...fieldA11y(errors, 'eventTitle')}
              />
              <FieldError errors={errors} name="eventTitle" />
            </div>

            {/* Special Activities */}
            <div className="form-group md:col-span-2">
              <p id="specialActivities-label" className="label">Special Activities</p>
              <p id="specialActivities-hint" className="text-xs text-dark-400 mb-3">Select any special activities for your event (optional, if you want a regular drink/borrel you can leave this empty)</p>
              <div role="group" aria-labelledby="specialActivities-label" aria-describedby="specialActivities-hint" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(formOptions?.specialActivities ?? Object.entries(SPECIAL_ACTIVITY_LABELS).map(([value, displayName]) => ({ value, displayName, description: undefined }))).map((option) => {
                  const selected = watchSpecialActivities.includes(option.value);
                  const blocked = !selected && isActivityBlocked(option.value, watchSpecialActivities);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      aria-labelledby={`activity-${option.value}-name`}
                      aria-describedby={`activity-${option.value}-desc`}
                      onClick={() => toggleActivity(option.value)}
                      disabled={blocked}
                      title={blocked ? 'Not compatible with another selected activity' : undefined}
                      className={`
                        relative flex items-start gap-2.5 p-3 rounded-lg border-2 transition-[background-color,border-color,box-shadow,opacity] duration-200 text-left w-full
                        ${selected
                          ? 'border-hubble-500 bg-hubble-500/10'
                          : blocked
                            ? 'border-dark-800 bg-dark-900/50 opacity-40 cursor-not-allowed'
                            : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                        }
                      `}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        selected ? 'border-hubble-500 bg-hubble-500' : 'border-dark-600 bg-dark-800'
                      }`}>
                        {selected && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span id={`activity-${option.value}-name`} className={`text-sm font-medium ${selected ? 'text-hubble-300' : 'text-white'}`}>
                          {option.displayName}
                        </span>
                        <p id={`activity-${option.value}-desc`} className="text-[11px] leading-snug text-dark-400 mt-0.5">
                          {option.description ?? SPECIAL_ACTIVITY_DESCRIPTIONS[option.value]}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {activityNotices.length > 0 && (
                <div className="mt-3 space-y-2" data-testid="activity-notices">
                  {activityNotices.map(notice => (
                    <div
                      key={notice.id}
                      data-testid="activity-notice"
                      className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{notice.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expected Guests */}
            <div className="form-group">
              <label htmlFor="expectedGuests" className="label">Expected Number of Guests *</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Decrease guest count"
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
                    id="expectedGuests"
                    inputMode="numeric"
                    {...fieldA11y(errors, 'expectedGuests', 'expectedGuests-hint')}
                    data-testid="expected-guests"
                    className="input-field text-center text-xl font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min={minGuests}
                    placeholder="50"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Increase guest count"
                  onClick={() => {
                    const current = watch('expectedGuests') || minGuests;
                    setValue('expectedGuests', current + 1);
                  }}
                  className="w-12 h-12 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dark-400 hover:text-white hover:bg-dark-700 hover:border-hubble-500 transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <FieldError errors={errors} name="expectedGuests" />
              {guestLimitWarning && (
                <div id="guest-limit-notice" role="alert" tabIndex={-1} className="mt-2 outline-none text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{guestLimitWarning}</span>
                </div>
              )}
              {locationConflict ? (
                <div id="location-conflict-notice" role="alert" tabIndex={-1} className="mt-2 outline-none text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{locationConflict}</span>
                </div>
              ) : (watchExpectedGuests < 8 && watchExpectedGuests >= 1) ? (
                <div className="mt-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                  Reservations under 8 guests are only available at Meteor. Location will be set automatically.
                </div>
              ) : null}
              <div className="mt-2 text-xs text-dark-400">
                <p id="expectedGuests-hint">Minimum reservation size: <span className="text-white">{minGuests} {minGuests === 1 ? 'person' : 'people'}</span></p>
              </div>
            </div>

            {/* Event Date */}
            <div className="form-group">
              <label htmlFor="eventDate" className="label">Event Date *</label>
              {requiresAdvanceBooking && (
                <div className="mb-2 text-xs text-blue-400/80 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                  ℹ️ Selected activities require at least <strong>{advanceBookingDays} days</strong> advance booking.
                </div>
              )}
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 z-10 pointer-events-none" />
                <input
                  type="date"
                  {...register('eventDate')} id="eventDate" {...fieldA11y(errors, 'eventDate')}
                  data-testid="event-date"
                  className="input-field pl-10 pr-4 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  min={minDateForBooking}
                />
              </div>
              <FieldError errors={errors} name="eventDate" />
              {/* Global / time-window blocks surface here by the date; location-specific
                  blocks surface in the location section below. */}
              {!blockedDateInfo?.locationSpecific && blockedDateNotice}
            </div>

            {/* Start Time */}
            <div className="form-group">
              <label htmlFor="startTime" className="label">Start Time *</label>
              <select {...register('startTime')} id="startTime" {...fieldA11y(errors, 'startTime')} data-testid="start-time" className="select-field">
                <option value="">Select start time...</option>
                {startTimes.map(time => <option key={time} value={time}>{time}</option>)}
              </select>
              <FieldError errors={errors} name="startTime" />
              {startTimeWarning && (
                <div className="mt-2 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <p>⚠️ <span className="font-medium">Note:</span> {startTimeWarning}</p>
                </div>
              )}
            </div>

            {/* End Time */}
            <div className="form-group">
              <label htmlFor="endTime" className="label">End Time *</label>
              <select {...register('endTime')} id="endTime" {...fieldA11y(errors, 'endTime')} data-testid="end-time" className="select-field">
                <option value="">Select end time...</option>
                {endTimes.map(time => <option key={time} value={time}>{time}</option>)}
              </select>
              <FieldError errors={errors} name="endTime" />
            </div>
          </div>

          {/* Location, seating & remarks — merged in from the former Location step so all
              date/activity/time/location constraints live on one page. */}
          <div className="space-y-6 pt-6 border-t border-dark-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-hubble-500/20">
              <MapPin className="w-5 h-5 text-hubble-400" />
            </div>
            <div>
              <h3 className="text-lg font-title font-semibold text-white tracking-tight">Location &amp; Seating</h3>
              <p className="text-sm text-dark-400 font-light">Where would you like to host your event?</p>
            </div>
          </div>

          {/* Location lock explanation. Only for activity-based locks here — the guest-count
              (<8 → Meteor) case is already explained next to the guest field above, so we don't
              repeat it now that both sit on the same step. */}
          {locationLocked && (() => {
            const lockConstraint = constraints.find(c =>
              c.constraintType === 'LOCATION_LOCK' && watchSpecialActivities.includes(c.triggerActivity));
            return lockConstraint ? (
              <div className="text-xs text-blue-400/80 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                {lockConstraint.message}
              </div>
            ) : null;
          })()}

          <div role="radiogroup" aria-label="Location" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Hubble */}
            <label className={`
              relative flex flex-col p-6 rounded-xl border-2 transition-[background-color,border-color,box-shadow,opacity] duration-200
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
                data-testid="location-HUBBLE"
                className="sr-only"
                disabled={!!locationLocked && locationLocked !== 'HUBBLE'}
              />
              <div className="flex items-center gap-3 mb-3">
                <img src="/logo-hubble.webp" alt="Hubble logo" className="w-10 h-10 rounded-lg object-contain bg-white p-1" />
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
              relative flex flex-col p-6 rounded-xl border-2 transition-[background-color,border-color,box-shadow,opacity] duration-200
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
                data-testid="location-METEOR"
                className="sr-only"
                disabled={!!locationLocked && locationLocked !== 'METEOR'}
              />
              <div className="flex items-center gap-3 mb-3">
                <img src="/logo-meteor.png" alt="Meteor logo" className="w-10 h-10 rounded-lg object-contain bg-white p-1" />
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
              relative flex flex-col p-6 rounded-xl border-2 transition-[background-color,border-color,box-shadow,opacity] duration-200
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
                data-testid="location-NO_PREFERENCE"
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

          {/* Blocked period notice — only for location-specific blocks here; global/time
              blocks are already surfaced (and acknowledged) on the date step. */}
          {blockedDateInfo?.locationSpecific && blockedDateNotice}

          {/* Seating Area Selection */}
          <div className="form-group">
            <p id="seatingArea-label" className="label">Seating Area *</p>
            {seatingLocked && (
              <div className="mb-3 text-xs text-blue-400/80 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                Seating is fixed to {seatingLocked === 'INSIDE' ? 'Inside' : 'Outside'} based on selected activities.
              </div>
            )}
            <div role="radiogroup" aria-labelledby="seatingArea-label" className="grid grid-cols-2 gap-3">
              {['INSIDE', 'OUTSIDE'].map((area) => (
                <label
                  key={area}
                  className={`
                    relative flex flex-col items-center p-4 rounded-xl border-2 transition-[background-color,border-color,box-shadow,opacity] duration-200
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
                    data-testid={`seating-${area}`}
                    {...fieldA11y(errors, 'seatingArea')}
                    className="sr-only"
                    disabled={!!seatingLocked && area !== seatingLocked}
                  />
                  <span aria-hidden="true" className="text-2xl mb-2">
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
            <FieldError errors={errors} name="seatingArea" />
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
            <label htmlFor="comments" className="label">Additional Location/Seating Remarks (optional)</label>
            <input
              type="text"
              {...register('comments')} maxLength={MAX_LENGTH.comments} id="comments"
              className="input-field"
              placeholder="e.g., Near the window, quiet corner..."
            />
          </div>
          </div>

          {/* Long reservation reason */}
          {rules.needsLongReservationReason && (
            <div className="form-group">
              <label htmlFor="longReservationReason" className="label flex items-center gap-2">
                <AlertTriangle aria-hidden="true" className="w-4 h-4 text-amber-400" />
                Reason for Long Reservation *
              </label>
              <p id="longReservationReason-hint" className="text-xs text-amber-400/80 mb-2">
                Your reservation is {Math.floor(durationMinutes / 60)}h{durationMinutes % 60 > 0 ? ` ${durationMinutes % 60}m` : ''} long.
                Reservations over 3 hours require a reason.
              </p>
              <textarea
                {...register('longReservationReason')} maxLength={MAX_LENGTH.longReservationReason}
                id="longReservationReason"
                {...fieldA11y(errors, 'longReservationReason', 'longReservationReason-hint')}
                className="input-field min-h-[80px] resize-none"
                placeholder="Please explain why you need more than 3 hours..."
              />
              <FieldError errors={errors} name="longReservationReason" />
            </div>
          )}

          {/* Catering dietary notes */}
          {rules.asksForDietaryNotes && (
            <div className="form-group">
              <label htmlFor="cateringDietaryNotes" className="label">Catering Dietary Notes</label>
              <textarea
                {...register('cateringDietaryNotes')} maxLength={MAX_LENGTH.cateringDietaryNotes} id="cateringDietaryNotes"
                className="input-field min-h-[80px] resize-none"
                placeholder="Allergies, dietary requirements, or other catering notes..."
              />
            </div>
          )}

          {/* Event Description */}
          <div className="form-group">
            <label htmlFor="description" className="label">Event Description *</label>
            <textarea
              {...register('description')} maxLength={MAX_LENGTH.description} id="description" {...fieldA11y(errors, 'description')}
              className="input-field min-h-[100px] resize-none"
              placeholder="Tell us more about your event..."
            />
            <FieldError errors={errors} name="description" />
          </div>
        </div>
  );
}
