import { Employee, PayslipItem, PaymentFrequency, StatutoryBreakdown, WorkSchedule } from '../types/payroll';
import {
  OT_REGULAR_MULTIPLIER,
  OT_RESTDAY_MULTIPLIER,
  NIGHT_DIFF_MULTIPLIER,
  PHILHEALTH_CEILING,
  PHILHEALTH_FLOOR,
  PHILHEALTH_RATE,
  PAGIBIG_CAP,
  PAGIBIG_LOW_THRESHOLD,
  TRAIN_MONTHLY_BRACKETS,
  TRAIN_SEMI_BRACKETS,
  clampSalary,
  round2,
  sssEcAmount,
  sssMonthlySalaryCredit,
} from './statutoryTables';
import { newId } from './id';

export interface ComputeOptions {
  periodStart: string;
  periodEnd: string;
  creditingDate: string;
  periodName: string;
  frequency: PaymentFrequency;
  overtimeHours?: number;
  /** Rest-day OT hours (DOLE 130% rate). Separate from regular OT. */
  restDayOvertimeHours?: number;
  /** Night-differential hours (10% of hourly rate). Defaults to 0. */
  nightDiffHours?: number;
  /** Regular-holiday pay amount already computed from attendance (added to gross, taxable). */
  holidayPay?: number;
  bonus?: number;
  /** Bonus/13th-month portion that is non-taxable (capped at P90k/yr — caller tracks YTD). */
  nonTaxableBonus?: number;
  tardinessMinutes?: number;
  undertimeMinutes?: number;
  /** Override the scheduled count (e.g. actual days from the work calendar). */
  daysWorked?: number;
  /** Mark output as calendar-sourced instead of manually entered. */
  attendanceSourced?: boolean;
}

function isValidDateString(s: string): boolean {
  if (!s || typeof s !== 'string') return false;
  const t = Date.parse(s);
  return !Number.isNaN(t);
}

/** Company default schedule: 6-day week resting Sunday, 8h/day. */
export const DEFAULT_WORK_SCHEDULE: WorkSchedule = { restDay: 0, daysPerWeek: 6, hoursPerDay: 8 };

/** DOLE divisors: 261 for a 5-day week, 313 for a 6-day week, 393 for a 7-day week. */
export const FACTOR_5_DAY = 261;
export const FACTOR_6_DAY = 313;
export const FACTOR_7_DAY = 393;
/** @deprecated Use factorForSchedule instead. */
export const WORKDAYS_PER_YEAR = FACTOR_5_DAY;
export const HOURS_PER_DAY = 8;
/** Default shift length when an employee has no custom hours set. */
export const DEFAULT_HOURS_PER_DAY = 8;

export function normalizeSchedule(schedule?: WorkSchedule): Required<WorkSchedule> {
  const restDay =
    schedule && Number.isInteger(schedule.restDay) && schedule.restDay >= 0 && schedule.restDay <= 6
      ? schedule.restDay
      : DEFAULT_WORK_SCHEDULE.restDay;
  const daysPerWeek = schedule?.daysPerWeek === 5 ? 5 : schedule?.daysPerWeek === 7 ? 7 : 6;
  return { restDay, daysPerWeek, hoursPerDay: hoursPerDayFor(schedule) };
}

/** Scheduled hours per work day for one employee (1–24, defaults to 8). */
export function hoursPerDayFor(schedule?: WorkSchedule): number {
  const h = schedule?.hoursPerDay;
  if (typeof h === 'number' && Number.isFinite(h) && h >= 1 && h <= 24) {
    return Math.round(h * 2) / 2;
  }
  return DEFAULT_HOURS_PER_DAY;
}

/** Unpaid minutes docked for a full-day absence under this schedule. */
export function fullDayMinutesFor(schedule?: WorkSchedule): number {
  return Math.round(hoursPerDayFor(schedule) * 60);
}

/** Unpaid minutes docked for a half-day under this schedule. */
export function halfDayMinutesFor(schedule?: WorkSchedule): number {
  return Math.round((hoursPerDayFor(schedule) / 2) * 60);
}

export function factorForSchedule(schedule?: WorkSchedule): number {
  const normalized = normalizeSchedule(schedule).daysPerWeek;
  if (normalized === 5) return FACTOR_5_DAY;
  if (normalized === 7) return FACTOR_7_DAY;
  return FACTOR_6_DAY;
}

function fallbackWorkingDays(frequency: PaymentFrequency, daysPerWeek: 5 | 6 | 7): number {
  if (daysPerWeek === 5) return frequency === 'semi-monthly' ? 11 : 22;
  if (daysPerWeek === 7) return frequency === 'semi-monthly' ? 15 : 30;
  return frequency === 'semi-monthly' ? 13 : 26;
}

/** OT pay per hour actually paid by the company: fixed ₱ rate if set, else hourly × 125%. */
export function otRateFor(employee: Pick<Employee, 'hourlyRate' | 'otHourlyRate'>): number {
  const fixed = employee.otHourlyRate;
  if (typeof fixed === 'number' && Number.isFinite(fixed) && fixed > 0) {
    return round2(fixed);
  }
  const hourly = Number.isFinite(employee.hourlyRate) && employee.hourlyRate > 0 ? employee.hourlyRate : 0;
  return round2(hourly * OT_REGULAR_MULTIPLIER);
}

/** Rest-day OT pay per hour: fixed rate if set, else hourly × 130% (DOLE). */
export function restDayOtRateFor(employee: Pick<Employee, 'hourlyRate' | 'otHourlyRate'>): number {
  // A company-set fixed OT rate overrides DOLE default for rest days too.
  const fixed = employee.otHourlyRate;
  if (typeof fixed === 'number' && Number.isFinite(fixed) && fixed > 0) {
    return round2(fixed);
  }
  const hourly = Number.isFinite(employee.hourlyRate) && employee.hourlyRate > 0 ? employee.hourlyRate : 0;
  return round2(hourly * OT_RESTDAY_MULTIPLIER);
}

/** Local YYYY-MM-DD for a Date (no UTC shift). */
export function toISODateLocal(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Single source of truth for "is this date a scheduled work day?".
 * 7-day works every day (including Sundays, no rest day).
 * 6-day rests only on restDay; 5-day additionally rests Sunday
 * (or Saturday when the rest day itself is Sunday).
 */
export function isScheduledWorkDay(isoDate: string, schedule?: WorkSchedule): boolean {
  if (!isValidDateString(isoDate)) return false;
  const strict = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  const d = strict
    ? new Date(Number(strict[1]), Number(strict[2]) - 1, Number(strict[3])).getDay()
    : new Date(isoDate).getDay();
  const { restDay, daysPerWeek } = normalizeSchedule(schedule);
  if (daysPerWeek === 7) return true;
  if (d === restDay) return false;
  if (daysPerWeek === 6) return true;
  return restDay === 0 ? d !== 6 : d !== 0;
}

/**
 * Scheduled working days in [start, end] inclusive, honoring the employee's
 * rest day and 5/6-day week.
 */
export function computeWorkingDays(
  periodStart: string,
  periodEnd: string,
  frequency: PaymentFrequency,
  schedule?: WorkSchedule,
): number {
  const { daysPerWeek } = normalizeSchedule(schedule);
  const fallback = fallbackWorkingDays(frequency, daysPerWeek);
  if (!isValidDateString(periodStart) || !isValidDateString(periodEnd)) return fallback;
  const s = new Date(periodStart);
  const e = new Date(periodEnd);
  if (e < s) return fallback;
  let count = 0;
  const cur = new Date(s);
  let guard = 0;
  while (cur <= e && guard < 62) {
    if (isScheduledWorkDay(toISODateLocal(cur), schedule)) count += 1;
    cur.setDate(cur.getDate() + 1);
    guard += 1;
  }
  return count > 0 ? count : fallback;
}

/**
 * Derive daily + hourly rates from a monthly salary.
 * Correct formula: daily = monthly × 12 / factor, hourly = daily / hoursPerDay,
 * where the factor is 261 (5-day), 313 (6-day, the default), or 393 (7-day),
 * and hoursPerDay is the employee's shift length (default 8).
 */
export function deriveRates(
  monthlyRate: number,
  schedule?: WorkSchedule,
): { dailyRate: number; hourlyRate: number } {
  const m = clampSalary(monthlyRate);
  const dailyRate = round2((m * 12) / factorForSchedule(schedule));
  const hours = hoursPerDayFor(schedule);
  return { dailyRate, hourlyRate: round2(dailyRate / hours) };
}

/**
 * SSS 2025+: 5% EE / 10% ER on MSC (P5k–P35k, P500 steps) + EC (P10/P30 ER).
 * EC is folded into the employer share so existing `StatutoryBreakdown` stays compatible.
 */
export function computeSSS(monthlyRate: number, frequency: PaymentFrequency): { ee: number; er: number; msc: number } {
  const salary = clampSalary(monthlyRate);
  const msc = sssMonthlySalaryCredit(salary);
  const monthlyEE = Math.round(msc * 0.05);
  const monthlyER = Math.round(msc * 0.1) + sssEcAmount(msc);
  const factor = frequency === 'semi-monthly' ? 0.5 : 1;
  return { ee: round2(monthlyEE * factor), er: round2(monthlyER * factor), msc };
}

/**
 * PhilHealth 5% shared equally, floor P10k / ceiling P100k.
 */
export function computePhilHealth(monthlyRate: number, frequency: PaymentFrequency): { ee: number; er: number } {
  const salary = Math.min(Math.max(clampSalary(monthlyRate), PHILHEALTH_FLOOR), PHILHEALTH_CEILING);
  const monthlyTotal = round2(salary * PHILHEALTH_RATE);
  const monthlyEE = round2(monthlyTotal / 2);
  const monthlyER = round2(monthlyTotal - monthlyEE);
  const factor = frequency === 'semi-monthly' ? 0.5 : 1;
  return { ee: round2(monthlyEE * factor), er: round2(monthlyER * factor) };
}

/**
 * Pag-IBIG: 1% EE if salary <= P1,500 else 2% EE; 2% ER always. Capped at P200.
 */
export function computePagIbig(monthlyRate: number, frequency: PaymentFrequency): { ee: number; er: number } {
  const salary = clampSalary(monthlyRate);
  const eeRate = salary <= PAGIBIG_LOW_THRESHOLD ? 0.01 : 0.02;
  const monthlyEE = Math.min(PAGIBIG_CAP, Math.round(salary * eeRate));
  const monthlyER = Math.min(PAGIBIG_CAP, Math.round(salary * 0.02));
  const factor = frequency === 'semi-monthly' ? 0.5 : 1;
  return { ee: round2(monthlyEE * factor), er: round2(monthlyER * factor) };
}

/** BIR TRAIN withholding on taxable compensation for the pay frequency. */
export function computeWithholdingTax(taxableIncome: number, frequency: PaymentFrequency): number {
  const income = Number.isFinite(taxableIncome) ? taxableIncome : 0;
  if (income <= 0) return 0;
  const table = frequency === 'semi-monthly' ? TRAIN_SEMI_BRACKETS : TRAIN_MONTHLY_BRACKETS;
  for (const b of table) {
    if (income <= b.upTo) {
      if (b.rate === 0) return 0;
      return round2(b.base + (income - b.floor) * b.rate);
    }
  }
  // Defensive fallback: income is above all brackets (should be unreachable given
  // the last bracket has upTo: Infinity), but we apply the top bracket explicitly
  // rather than silently returning 0 (#9).
  const top = table[table.length - 1];
  return round2(top.base + (income - top.floor) * top.rate);
}

/**
 * Full Philippine payslip for one employee + cut-off.
 * Taxable income = (base - tardiness + OT + rest-day OT + night-diff + holiday
 *   + taxable allowances + taxable bonus) - mandatory EE share.
 * De-minimis + declared non-taxable bonus excluded.
 */
export function calculatePhilippinePayslip(employee: Employee, options: ComputeOptions): PayslipItem {
  const isSemiMonthly = options.frequency === 'semi-monthly';
  const monthlyRate = clampSalary(employee.monthlyRate);
  const hourlyRate = Number.isFinite(employee.hourlyRate) && employee.hourlyRate > 0 ? employee.hourlyRate : 0;

  const baseSalary = isSemiMonthly ? round2(monthlyRate / 2) : round2(monthlyRate);

  const tardinessMins = Math.max(0, Math.floor(options.tardinessMinutes ?? 0));
  const undertimeMins = Math.max(0, Math.floor(options.undertimeMinutes ?? 0));
  const totalLateMins = tardinessMins + undertimeMins;
  const minuteRate = hourlyRate > 0 ? hourlyRate / 60 : 0;
  const tardinessDeduction = round2(totalLateMins * minuteRate);

  const otHours = Math.max(0, options.overtimeHours ?? 0);
  const overtimePay = round2(otHours * otRateFor(employee));

  // Rest-day OT at DOLE 130% rate (#3)
  const rdOtHours = Math.max(0, options.restDayOvertimeHours ?? 0);
  const restDayOvertimePay = round2(rdOtHours * restDayOtRateFor(employee));

  const ndHours = Math.max(0, options.nightDiffHours ?? 0);
  const nightDiffPay = round2(ndHours * hourlyRate * NIGHT_DIFF_MULTIPLIER);

  const holidayPay = round2(Math.max(0, options.holidayPay ?? 0));

  const factor = isSemiMonthly ? 0.5 : 1;
  const scaledAllowances = employee.allowances.map((al) => ({
    ...al,
    amount: round2(clampSalary(al.amount) * factor),
  }));

  const deMinimisTotal = round2(
    scaledAllowances.filter((a) => !a.isTaxable).reduce((sum, a) => sum + a.amount, 0),
  );
  const taxableAllowancesTotal = round2(
    scaledAllowances.filter((a) => a.isTaxable).reduce((sum, a) => sum + a.amount, 0),
  );

  const bonusAmount = round2(Math.max(0, options.bonus ?? 0));
  const nonTaxableBonus = round2(Math.min(Math.max(0, options.nonTaxableBonus ?? 0), bonusAmount));
  const taxableBonus = round2(bonusAmount - nonTaxableBonus);

  const grossEarnings = Math.max(
    0,
    round2(
      baseSalary +
        overtimePay +
        restDayOvertimePay +
        nightDiffPay +
        holidayPay +
        deMinimisTotal +
        taxableAllowancesTotal +
        bonusAmount -
        tardinessDeduction,
    ),
  );

  // Employees without benefits yet (e.g. casual / time-based workers not
  // enrolled in SSS/PhilHealth/Pag-IBIG) skip those contributions entirely —
  // no minimums are charged. BIR withholding below still applies per tax law.
  const exempt = employee.statutoryExempt === true;
  const sss = exempt ? { ee: 0, er: 0 } : computeSSS(monthlyRate, options.frequency);
  const philhealth = exempt ? { ee: 0, er: 0 } : computePhilHealth(monthlyRate, options.frequency);
  const pagibig = exempt ? { ee: 0, er: 0 } : computePagIbig(monthlyRate, options.frequency);

  const totalMandatoryEE = round2(sss.ee + philhealth.ee + pagibig.ee);
  const taxableBase = round2(
    baseSalary -
      tardinessDeduction +
      overtimePay +
      restDayOvertimePay +
      nightDiffPay +
      holidayPay +
      taxableAllowancesTotal +
      taxableBonus,
  );
  const netTaxableIncome = Math.max(0, round2(taxableBase - totalMandatoryEE));
  const withholdingTax = computeWithholdingTax(netTaxableIncome, options.frequency);

  const statutory: StatutoryBreakdown = {
    sssEmployee: sss.ee,
    sssEmployer: sss.er,
    philhealthEmployee: philhealth.ee,
    philhealthEmployer: philhealth.er,
    pagibigEmployee: pagibig.ee,
    pagibigEmployer: pagibig.er,
    withholdingTax,
  };

  const customDeductionsScaled = employee.customDeductions.map((d) => ({
    ...d,
    amount: round2(clampSalary(d.amount) * factor),
  }));
  const customDeductionsSum = round2(customDeductionsScaled.reduce((sum, d) => sum + d.amount, 0));

  const totalDeductions = round2(
    statutory.sssEmployee + statutory.philhealthEmployee + statutory.pagibigEmployee + statutory.withholdingTax + customDeductionsSum,
  );
  const netPay = Math.max(0, round2(grossEarnings - totalDeductions));

  const endValid = isValidDateString(options.periodEnd);
  const yyyymm = endValid ? options.periodEnd.replace(/-/g, '').slice(0, 6) : '000000';
  const suffix = isSemiMonthly ? (endValid && new Date(options.periodEnd).getDate() <= 15 ? 'A' : 'B') : 'M';
  const empNo = (employee.employeeNumber || '0000').replace(/[^A-Za-z0-9-]/g, '');
  const payslipNumber = `PS-${yyyymm}${suffix}-${empNo}`;

  return {
    id: newId(`ps-${employee.id}`),
    employeeId: employee.id,
    employeeNumber: employee.employeeNumber,
    employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
    employeeEmail: employee.email,
    jobTitle: employee.jobTitle,
    department: employee.department,
    employmentType: employee.employmentType,
    governmentIds: { ...employee.governmentIds },
    bankDetails: { ...employee.bankDetails },

    daysWorked:
      options.daysWorked !== undefined
        ? Math.max(0, Math.round(options.daysWorked * 2) / 2)
        : computeWorkingDays(options.periodStart, options.periodEnd, options.frequency, employee.workSchedule),
    tardinessMinutes: totalLateMins,
    undertimeMinutes: undertimeMins,
    tardinessDeduction,
    overtimeHours: otHours,
    overtimePay,
    restDayOvertimeHours: rdOtHours > 0 ? rdOtHours : undefined,
    restDayOvertimePay: restDayOvertimePay > 0 ? restDayOvertimePay : undefined,
    nightDiffHours: ndHours,
    nightDiffPay,
    ...(exempt ? { statutoryExempt: true as const } : {}),
    ...(options.attendanceSourced ? { attendanceSourced: true as const } : {}),
    holidayPay: holidayPay > 0 ? holidayPay : undefined,

    basicPay: baseSalary,
    deMinimisTotal,
    taxableAllowancesTotal,
    allowances: scaledAllowances,
    bonus: bonusAmount,
    grossEarnings,

    statutory,
    customDeductions: customDeductionsScaled,
    totalDeductions,

    netPay,

    payslipNumber,
    periodName: options.periodName,
    periodStart: options.periodStart,
    periodEnd: options.periodEnd,
    creditingDate: options.creditingDate,
    // generatedDate records when the payslip was created for audit trail (#7),
    // not when the bank credits — that is creditingDate.
    generatedDate: new Date().toISOString(),
    paymentMethod: 'Bank Direct Deposit (BACS/PESONet)',
  };
}

/** Recompute run-level totals from payslips (single helper, no duplication). */
export function summarizePayslips(payslips: PayslipItem[]) {
  const sum = (f: (p: PayslipItem) => number) => round2(payslips.reduce((s, p) => s + f(p), 0));
  return {
    totalGrossPay: sum((p) => p.grossEarnings),
    totalDeductions: sum((p) => p.totalDeductions),
    totalNetPay: sum((p) => p.netPay),
    totalWithholdingTax: sum((p) => p.statutory.withholdingTax),
    totalSssEmployee: sum((p) => p.statutory.sssEmployee),
    totalSssEmployer: sum((p) => p.statutory.sssEmployer),
    totalPhilhealthEmployee: sum((p) => p.statutory.philhealthEmployee),
    totalPhilhealthEmployer: sum((p) => p.statutory.philhealthEmployer),
    totalPagibigEmployee: sum((p) => p.statutory.pagibigEmployee),
    totalPagibigEmployer: sum((p) => p.statutory.pagibigEmployer),
  };
}
