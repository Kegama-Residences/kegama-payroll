/**
 * Helpers for controlled numeric <input> fields.
 *
 * Problem: with `value={0}` + `onChange={set(parseFloat(v) || 0)}`, clearing
 * the field instantly snaps back to `0` (empty string parses to NaN → 0), so
 * the user can never delete-and-retype, and typing a second digit keeps a
 * sticky leading zero.
 *
 * Fix: render `value={numOrEmpty(x)}` with `placeholder="0"`. Zero/empty both
 * display as blank; typing works naturally ("0" → type "5" → "5", not "05").
 * Parse with `parseNumInput` / `parseIntInput`, which treat blank as 0.
 */

/** Display value for a numeric input: blank when 0/undefined, number otherwise. */
export function numOrEmpty(v: number | undefined | null): number | '' {
  return v ? v : '';
}

/** Parse a decimal input string; blank or invalid → 0. */
export function parseNumInput(raw: string): number {
  if (raw == null || String(raw).trim() === '') return 0;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Parse an integer input string (minutes, counts); blank or invalid → 0. */
export function parseIntInput(raw: string): number {
  if (raw == null || String(raw).trim() === '') return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}
