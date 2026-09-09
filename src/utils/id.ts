/**
 * Shared UUID / ID generation utilities.
 * Uses crypto.randomUUID when available; falls back to a timestamp + random
 * combo that is collision-resistant enough for client-side payroll IDs.
 */

export function newId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    /* fall through */
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffff).toString(36)}`;
}
