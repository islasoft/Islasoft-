import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO, isValid } from "date-fns"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 

export const isIframe = window.self !== window.top;

/**
 * Format any date value as MM/DD/YYYY.
 * Accepts a Date object, ISO string, or YYYY-MM-DD string.
 * Returns an empty string if the value is falsy or invalid.
 */
export function formatDate(value) {
  if (!value) return '';
  try {
    let date;
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string') {
      // Handle YYYY-MM-DD without timezone shift
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        date = new Date(y, m - 1, d);
      } else {
        date = parseISO(value);
      }
    } else {
      date = new Date(value);
    }
    if (!isValid(date)) return value;
    return format(date, 'MM/dd/yyyy');
  } catch {
    return value;
  }
}