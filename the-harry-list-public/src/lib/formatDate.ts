const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

/**
 * A form date (yyyy-mm-dd) as guests read it: "Monday 30 November 2026". Built by hand
 * rather than with toLocaleDateString, whose punctuation differs between browsers.
 * Anything that is not a valid yyyy-mm-dd date is returned unchanged.
 */
export function formatEventDate(isoDate: string | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate ?? '');
  if (!match) return isoDate ?? '';
  const [, y, m, d] = match.map(Number);
  // Local noon, so no time zone can move the date to the day before or after.
  const date = new Date(y, m - 1, d, 12);
  if (date.getMonth() !== m - 1 || date.getDate() !== d) return isoDate ?? '';
  return `${WEEKDAYS[date.getDay()]} ${d} ${MONTHS[m - 1]} ${y}`;
}
