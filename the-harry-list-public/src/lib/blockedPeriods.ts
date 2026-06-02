import type { BlockedPeriod } from '../types/reservation';

/** Default acknowledgement label shown for a soft block when none is configured. */
export const DEFAULT_SOFT_BLOCK_ACKNOWLEDGEMENT =
  'I understand the bar may be closed during this period and that my reservation is a request.';

/** Default warning shown for a soft block when no public message is configured. */
export const DEFAULT_SOFT_BLOCK_MESSAGE =
  'We are by default closed during this period, but by acknowledging the message below you can still place a reservation request.';

/** Default message shown for a (hard) block when no public message is configured. */
export const DEFAULT_HARD_BLOCK_MESSAGE = 'This date is not available for reservations.';

export interface BlockedDateMatch {
  /** Public-facing message to display to the guest. */
  message: string;
  /** When true the block is advisory: the guest may proceed after acknowledging it. */
  soft: boolean;
  /** Checkbox label for the acknowledgement (only meaningful when soft). */
  acknowledgementText: string;
  /** True when the block only applies because of the selected location. */
  locationSpecific: boolean;
}

/**
 * Determine whether the chosen date/location/time falls inside an active blocked
 * period and, if so, return how it should be surfaced to the guest.
 *
 * Returns null when no block applies. A hard block (soft === false) prevents the
 * booking; a soft block warns but allows it once acknowledged.
 */
export function checkBlockedDate(
  eventDate: string | null | undefined,
  location: string | null | undefined,
  blockedPeriods: BlockedPeriod[],
  startTime?: string
): BlockedDateMatch | null {
  if (!eventDate || blockedPeriods.length === 0) return null;
  for (const bp of blockedPeriods) {
    if (eventDate >= bp.startDate && eventDate <= bp.endDate) {
      if (bp.location) {
        // Location-specific block: only applies if the guest picked that exact location.
        if (!location || location === 'NO_PREFERENCE' || location === '' || bp.location !== location) {
          continue;
        }
      }
      // Time-specific block: only applies if the start time falls within the blocked window.
      if (bp.startTime && bp.endTime) {
        if (!startTime || startTime < bp.startTime || startTime >= bp.endTime) {
          continue;
        }
      }
      const soft = bp.softBlock === true;
      return {
        message: bp.publicMessage || (soft ? DEFAULT_SOFT_BLOCK_MESSAGE : DEFAULT_HARD_BLOCK_MESSAGE),
        soft,
        acknowledgementText: bp.acknowledgementText?.trim() || DEFAULT_SOFT_BLOCK_ACKNOWLEDGEMENT,
        locationSpecific: !!bp.location,
      };
    }
  }
  return null;
}
