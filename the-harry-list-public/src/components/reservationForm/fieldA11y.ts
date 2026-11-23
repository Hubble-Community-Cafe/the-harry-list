import type { FieldErrors } from 'react-hook-form';
import type { ReservationFormData } from '../../types/reservation';

/** The id of a field's error message, as rendered by <FieldError>. */
export const errorId = (name: keyof ReservationFormData) => `${name}-error`;

/**
 * Marks a field invalid and links it to its error message, so screen readers announce
 * the error with the field. `describedBy` adds other hints (space-separated ids).
 */
export function fieldA11y(
  errors: FieldErrors<ReservationFormData>,
  name: keyof ReservationFormData,
  describedBy?: string,
) {
  const invalid = !!errors[name];
  const ids = [invalid ? errorId(name) : undefined, describedBy].filter(Boolean).join(' ');
  return {
    'aria-invalid': invalid || undefined,
    'aria-describedby': ids || undefined,
  };
}
