import { useEffect, useRef } from 'react';
import type { FieldPath, FieldValues, PathValue, UseFormGetValues, UseFormSetValue } from 'react-hook-form';

/**
 * Forces a form field to `locked` while a lock applies (e.g. under 8 guests means Meteor, or
 * an activity that fixes the seating), and gives the guest their own earlier choice back
 * once the lock lifts, instead of silently keeping the forced value. A field the guest never
 * filled in goes back to empty. `getValues` and `setValue` must be the stable functions
 * from useForm.
 */
export function useRestoreAfterLock<T extends FieldValues, K extends FieldPath<T>>(
  field: K,
  locked: PathValue<T, K> | null,
  getValues: UseFormGetValues<T>,
  setValue: UseFormSetValue<T>,
): void {
  // Wrapped so "no lock is holding a choice" (null) differs from "the choice was empty".
  const beforeLock = useRef<{ value: PathValue<T, K> } | null>(null);

  useEffect(() => {
    if (locked) {
      if (!beforeLock.current) {
        beforeLock.current = { value: getValues(field) };
      }
      setValue(field, locked);
    } else if (beforeLock.current) {
      setValue(field, beforeLock.current.value);
      beforeLock.current = null;
    }
  }, [field, locked, getValues, setValue]);
}
