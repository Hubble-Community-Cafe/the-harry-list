import { describe, it, expect } from 'vitest';
import { apiErrorMessage } from '../lib/apiError';

describe('apiErrorMessage', () => {
  it('reads the detail of a problem response', () => {
    expect(apiErrorMessage({ title: 'Bad Request', status: 400, detail: 'Location must be set before confirming' }, 'x'))
      .toBe('Location must be set before confirming');
  });

  it('prefers detail over the validation list, since detail already names the first field', () => {
    expect(apiErrorMessage({
      detail: 'invoiceType: Please select an invoice type',
      errors: [{ field: 'invoiceType', message: 'Please select an invoice type' }],
    }, 'x')).toBe('invoiceType: Please select an invoice type');
  });

  it('still understands the older message and error fields', () => {
    expect(apiErrorMessage({ message: 'Old style' }, 'x')).toBe('Old style');
    expect(apiErrorMessage({ error: 'Older style' }, 'x')).toBe('Older style');
  });

  it('joins a bare validation list', () => {
    expect(apiErrorMessage({ errors: [{ message: 'a' }, { defaultMessage: 'b' }] }, 'x')).toBe('a, b');
  });

  it('falls back for empty or unexpected bodies', () => {
    expect(apiErrorMessage(null, 'Request failed')).toBe('Request failed');
    expect(apiErrorMessage('oops', 'Request failed')).toBe('Request failed');
    expect(apiErrorMessage({ detail: '  ' }, 'Request failed')).toBe('Request failed');
  });
});
