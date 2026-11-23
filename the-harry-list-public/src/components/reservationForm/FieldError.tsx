import type { FieldErrors } from 'react-hook-form';
import type { ReservationFormData } from '../../types/reservation';
import { errorId } from './fieldA11y';

interface FieldErrorProps {
  errors: FieldErrors<ReservationFormData>;
  name: keyof ReservationFormData;
  className?: string;
}

/** A field's validation message, with the id that fieldA11y() points the field at. */
export function FieldError({ errors, name, className }: FieldErrorProps) {
  const message = errors[name]?.message;
  if (!message) return null;
  return (
    <p id={errorId(name)} className={className ? `error-text ${className}` : 'error-text'}>
      {String(message)}
    </p>
  );
}
