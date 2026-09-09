/**
 * Philippine Peso (PHP - ₱) currency and Philippine date formatting utilities.
 */

/** Format a Date as "YYYY-MM-DD" in local time (no UTC shift). */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const CURRENCY_CODE = 'PHP';
export const CURRENCY_SYMBOL = '₱';

export function formatPHP(amount: number): string {
  const safeAmount = isNaN(amount) ? 0 : amount;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

// Compact format without symbol for tight tabular columns
export function formatAmount(amount: number): string {
  const safeAmount = isNaN(amount) ? 0 : amount;
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

function parseLocalDateString(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(s);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  try {
    const date = parseLocalDateString(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatCutoffPeriod(start: string, end: string): string {
  if (!start || !end) return '—';
  try {
    const s = parseLocalDateString(start);
    const e = parseLocalDateString(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return `${start} to ${end}`;
    const sMonth = s.toLocaleDateString('en-PH', { month: 'short' });
    const eMonth = e.toLocaleDateString('en-PH', { month: 'short' });
    const sDay = s.getDate();
    const eDay = e.getDate();
    const year = e.getFullYear();

    if (sMonth === eMonth) {
      return `${sMonth} ${sDay}–${eDay}, ${year}`;
    }
    return `${sMonth} ${sDay} – ${eMonth} ${eDay}, ${year}`;
  } catch {
    return `${start} to ${end}`;
  }
}
