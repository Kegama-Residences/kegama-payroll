/**
 * Single source of truth for Philippine statutory tables.
 * Effective: 2025-2026 rates (SSS Circular 2024-006, PhilHealth Circ. 2023-0012,
 * Pag-IBIG Circ., BIR TRAIN Law RR 8-2018).
 *
 * All monthly figures here. Semi-monthly values are derived by halving,
 * so both frequencies stay consistent by construction.
 */

export const SSS_FLOOR = 5000;
export const SSS_CEILING = 35000;
export const SSS_EE_RATE = 0.05;
export const SSS_ER_RATE = 0.10;
/** Employer EC top-up: P10 if MSC <= 14500 else P30 (SSS EC program). */
export function sssEcAmount(msc: number): number {
  return msc <= 14500 ? 10 : 30;
}

/** MSC in P500 steps, matching SSS bracket structure. */
export function sssMonthlySalaryCredit(monthlyRate: number): number {
  const safe = Number.isFinite(monthlyRate) ? monthlyRate : 0;
  if (safe <= SSS_FLOOR) return SSS_FLOOR;
  if (safe >= SSS_CEILING) return SSS_CEILING;
  return SSS_FLOOR + 500 * Math.floor((safe - SSS_FLOOR) / 500);
}

export const PHILHEALTH_RATE = 0.05;
export const PHILHEALTH_FLOOR = 10000;
export const PHILHEALTH_CEILING = 100000;

export const PAGIBIG_CAP = 200;
export const PAGIBIG_LOW_THRESHOLD = 1500;

export const DE_MINIMIS_ANNUAL_EXEMPT_CAP = 90000;
export const THIRTEENTH_MONTH_EXEMPT_CAP = 90000;

/** DOLE overtime / premium multipliers on hourly rate. */
export const OT_REGULAR_MULTIPLIER = 1.25;
export const OT_RESTDAY_MULTIPLIER = 1.3;
export const NIGHT_DIFF_MULTIPLIER = 0.1;
export const HOLIDAY_REGULAR_MULTIPLIER = 2.0;

export interface TaxBracket {
  /** Upper bound (inclusive) for this bracket, Infinity for top. */
  upTo: number;
  /** Base tax due at the bottom of this bracket. */
  base: number;
  /** Marginal rate applied above `floor`. */
  rate: number;
  /** Lower bound where `rate` starts applying. */
  floor: number;
}

/**
 * Official BIR TRAIN monthly withholding table (compensation income).
 * Derived from RR 8-2018. Keep monthly as canonical; semi-monthly is half.
 */
export const TRAIN_MONTHLY_BRACKETS: TaxBracket[] = [
  { upTo: 20833, base: 0, rate: 0, floor: 0 },
  { upTo: 33333, base: 0, rate: 0.15, floor: 20833 },
  { upTo: 66666, base: 1875, rate: 0.2, floor: 33333 },
  { upTo: 166666, base: 8541.67, rate: 0.25, floor: 66666 },
  { upTo: 666666, base: 33541.67, rate: 0.3, floor: 166666 },
  { upTo: Infinity, base: 183541.67, rate: 0.35, floor: 666666 },
];

/**
 * Semi-monthly table = monthly / 2, rounded to whole pesos for payroll practice.
 * Exemption: P10,417 (20833/2 rounded up), matching BIR withholding tables
 * published for semi-monthly filers. Base tax = monthly base / 2.
 */
export const TRAIN_SEMI_BRACKETS: TaxBracket[] = [
  { upTo: 10417, base: 0, rate: 0, floor: 0 },
  { upTo: 16667, base: 0, rate: 0.15, floor: 10417 },
  { upTo: 33333, base: 937.5, rate: 0.2, floor: 16667 },
  { upTo: 83333, base: 4270.83, rate: 0.25, floor: 33333 },
  { upTo: 333333, base: 16770.83, rate: 0.3, floor: 83333 },
  { upTo: Infinity, base: 91770.83, rate: 0.35, floor: 333333 },
];

export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Clamp helper for salary inputs. */
export function clampSalary(n: number, min = 0, max = 1_000_000_000): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(min, n));
}
