export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

/**
 * Format any date value as MM/DD/YYYY.
 * Accepts ISO strings, Date objects, or YYYY-MM-DD strings.
 * Returns '' if the value is null/undefined/invalid.
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  let d: Date;
  if (value instanceof Date) {
    d = value;
  } else {
    // Handle YYYY-MM-DD (no time) without timezone shifting
    const iso = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, day] = iso.split('-').map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(iso);
    }
  }
  if (isNaN(d.getTime())) return String(value);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}