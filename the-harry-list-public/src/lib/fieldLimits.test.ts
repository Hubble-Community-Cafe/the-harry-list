import { describe, it, expect } from 'vitest';
import { MAX_LENGTH, tooLongMessage } from './fieldLimits';
// Vite's ?raw import reads the file as text, so the test needs no Node APIs.
import requestDto from '../../../the-harry-list-backend/src/main/java/com/pimvanleeuwen/the_harry_list_backend/dto/PublicReservationRequest.java?raw';

// The limits must match the backend, or the form either cuts guests off too early or lets
// them type text the API then rejects. This reads the backend request class directly.
function backendLimits(): Record<string, number> {
  const limits: Record<string, number> = {};
  for (const match of requestDto.matchAll(/@Size\(max = (\d+)[^)]*\)\s+private String (\w+);/g)) {
    limits[match[2]] = Number(match[1]);
  }
  return limits;
}

describe('field limits', () => {
  it('match every @Size limit on the backend request', () => {
    expect({ ...MAX_LENGTH }).toEqual(backendLimits());
  });

  it('word the message like the backend does', () => {
    expect(tooLongMessage('Event title', 'eventTitle')).toBe('Event title must not exceed 255 characters');
  });
});
