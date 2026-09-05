/**
 * Philippine Peso (PHP - ₱) currency and Philippine date formatting utilities.
 */

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

export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
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
    const s = new Date(start);
    const e = new Date(end);
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
