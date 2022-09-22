import dateFormat from 'dateformat';
import { DATE_FORMAT, DATE_FORMAT_SIMPLE } from '../../constants.js';

/**
 * Converts a given `epoch` to a desired display format.
 *
 * @param {number|string} epoch The time to convert. May be any value that is
 * valid for `new Date()`.
 * @param {boolean|string} [translateTime=false] When `false`, the given `epoch`
 * will simply be returned. When `true`, the given `epoch` will be converted
 * to a string at UTC using the `DATE_FORMAT` constant. If `translateTime` is
 * a string, the following rules are available:
 *
 * - `<format string>`: The string is a literal format string. This format
 * string will be used to interpret the `epoch` and return a display string
 * at UTC.
 * - `SYS:STANDARD`: The returned display string will follow the `DATE_FORMAT`
 * constant at the system's local timezone.
 * - `SYS:<format string>`: The returned display string will follow the given
 * `<format string>` at the system's local timezone.
 * - `UTC:<format string>`: The returned display string will follow the given
 * `<format string>` at UTC.
 *
 * @returns {number|string} The formatted time.
 */
export function formatTime(
  epoch: number | string,
  translateTime: boolean | string = false,
): number | string {
  if (translateTime === false) {
    return epoch;
  }

  const instant = createDate(epoch);

  // If the Date is invalid, do not attempt to format
  if (!isValidDate(instant)) {
    return epoch;
  }

  if (translateTime === true) {
    return dateFormat(instant, DATE_FORMAT_SIMPLE);
  }

  const upperFormat = translateTime.toUpperCase();
  if (upperFormat === 'SYS:STANDARD') {
    return dateFormat(instant, DATE_FORMAT);
  }

  const prefix = upperFormat.substring(0, 4);
  if (prefix === 'SYS:' || prefix === 'UTC:') {
    if (prefix === 'UTC:') {
      return dateFormat(instant, translateTime);
    }
    return dateFormat(instant, translateTime.slice(4));
  }

  return dateFormat(instant, `UTC:${translateTime}`);
}

/**
 * Constructs a JS Date from a number or string. Accepts any single number
 * or single string argument that is valid for the Date() constructor,
 * or an epoch as a string.
 *
 * @param {string|number} epoch The representation of the Date.
 *
 * @returns {Date} The constructed Date.
 */
export function createDate(epoch: string | number): Date {
  // If epoch is already a valid argument, return the valid Date
  let date = new Date(epoch);
  if (isValidDate(date)) {
    return date;
  }

  // Convert to a number to permit epoch as a string
  date = new Date(+epoch);
  return date;
}

/**
 * Checks if the argument is a JS Date and not 'Invalid Date'.
 *
 * @param {Date} date The date to check.
 *
 * @returns {boolean} true if the argument is a JS Date and not 'Invalid Date'.
 */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !Number.isNaN(date.getTime());
}
