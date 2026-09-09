import { describe, expect, it } from 'vitest';
import {
  calculatePhilippinePayslip,
  computePagIbig,
  computePhilHealth,
  computeSSS,
  computeWithholdingTax,
  computeWorkingDays,
  deriveRates,
  summarizePayslips,
} from '../calculations';
import { TRAIN_MONTHLY_BRACKETS, TRAIN_SEMI_BRACKETS } from '../statutoryTables';
import type { Employee } from '../../types/payroll';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-test-1',
    employeeNumber: 'KGM-0001',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    email: 'juan@example.com',
    phone: '+639171234567',
    jobTitle: 'Front Desk',
    department: 'Rooms',
    hireDate: '2024-01-15',
    employmentType: 'regular',
    monthlyRate: 25000,
    dailyRate: 1149.43,
    hourlyRate: 143.68,
    governmentIds: { tin: '123-456-789-000', sss: '04-1234567-8', philhealth: '12-123456789-0', pagibig: '1234-5678-9012' },
    bankDetails: { bankName: 'BDO Unibank', accountNumber: '****1234', accountType: 'payroll' },
    allowances: [],
    customDeductions: [],
    status: 'active',
    ...overrides,
  };
}

const baseOpts = {
  periodStart: '2026-09-01',
  periodEnd: '2026-09-15',
  creditingDate: '2026-09-15',
  periodName: 'September 1-15, 2026 (1st Cut-Off)',
  frequency: 'semi-monthly' as const,
};

describe('SSS 2025 table (5% EE / 10% ER + EC, MSC 5k-35k)', () => {
  it('floors low salaries at MSC 5000', () => {
    expect(computeSSS(3000, 'monthly')).toMatchObject({ ee: 250, er: 510 });
  });
  it('caps high salaries at MSC 35000', () => {
    const capped = computeSSS(100000, 'monthly');
    const atCap = computeSSS(35000, 'monthly');
    expect(capped.ee).toBe(atCap.ee);
    expect(capped.er).toBe(atCap.er);
    expect(capped.msc).toBe(35000);
  });
  it('splits evenly for semi-monthly', () => {
    const monthly = computeSSS(25000, 'monthly');
    const semi = computeSSS(25000, 'semi-monthly');
    expect(semi.ee).toBeCloseTo(monthly.ee / 2, 2);
    expect(semi.er).toBeCloseTo(monthly.er / 2, 2);
  });
  it('uses P500 MSC steps', () => {
    expect(computeSSS(25249, 'monthly').msc).toBe(25000);
    expect(computeSSS(25250, 'monthly').msc).toBe(25000);
  });
});

describe('PhilHealth 5% shared, floor 10k / ceiling 100k', () => {
  it('floors at 10k => P500 total', () => {
    expect(computePhilHealth(8000, 'monthly')).toMatchObject({ ee: 250, er: 250 });
  });
  it('caps at 100k => P5000 total', () => {
    expect(computePhilHealth(200000, 'monthly')).toMatchObject({ ee: 2500, er: 2500 });
  });
  it('halves for semi-monthly', () => {
    expect(computePhilHealth(20000, 'semi-monthly')).toMatchObject({ ee: 250, er: 250 });
  });
});

describe('Pag-IBIG salary-based (1%/2%, cap 200)', () => {
  it('charges 1% EE for <=1500', () => {
    expect(computePagIbig(1000, 'monthly')).toMatchObject({ ee: 10, er: 20 });
  });
  it('caps at 200 for high earners', () => {
    expect(computePagIbig(50000, 'monthly')).toMatchObject({ ee: 200, er: 200 });
    expect(computePagIbig(50000, 'semi-monthly')).toMatchObject({ ee: 100, er: 100 });
  });
});

describe('BIR TRAIN tables consistent (semi = monthly / 2)', () => {
  it('monthly and semi tables align', () => {
    expect(TRAIN_SEMI_BRACKETS).toHaveLength(TRAIN_MONTHLY_BRACKETS.length);
    for (let i = 1; i < TRAIN_MONTHLY_BRACKETS.length - 1; i++) {
      expect(TRAIN_SEMI_BRACKETS[i].base).toBeCloseTo(TRAIN_MONTHLY_BRACKETS[i].base / 2, 0);
    }
    // Exemption halves correctly (rounded to peso)
    expect(TRAIN_SEMI_BRACKETS[0].upTo).toBe(10417);
    expect(TRAIN_MONTHLY_BRACKETS[0].upTo).toBe(20833);
  });
  it('zero tax below exemption', () => {
    expect(computeWithholdingTax(10417, 'semi-monthly')).toBe(0);
    expect(computeWithholdingTax(20833, 'monthly')).toBe(0);
    expect(computeWithholdingTax(0, 'monthly')).toBe(0);
    expect(computeWithholdingTax(-100, 'monthly')).toBe(0);
  });
  it('first bracket math', () => {
    // (12000 - 10417) * 15% = 237.45
    expect(computeWithholdingTax(12000, 'semi-monthly')).toBeCloseTo(237.45, 1);
    expect(computeWithholdingTax(25000, 'monthly')).toBeCloseTo(625.05, 1);
  });
});

describe('calculatePhilippinePayslip', () => {
  it('computes base + statutory for clean run', () => {
    const p = calculatePhilippinePayslip(makeEmployee(), baseOpts);
    expect(p.basicPay).toBe(12500);
    expect(p.grossEarnings).toBeGreaterThan(0);
    expect(p.totalDeductions).toBeGreaterThan(0);
    expect(p.netPay).toBeCloseTo(p.grossEarnings - p.totalDeductions, 2);
    expect(p.payslipNumber).toMatch(/^PS-202609A-KGM-0001$/);
    expect(p.id).toContain('emp-test-1');
  });
  it('handles overtime (125%) + night diff (10%) + tardiness', () => {
    const emp = makeEmployee({ hourlyRate: 100 });
    const p = calculatePhilippinePayslip(emp, { ...baseOpts, overtimeHours: 4, nightDiffHours: 8, tardinessMinutes: 60 });
    expect(p.overtimePay).toBe(500);
    expect(p.nightDiffPay).toBe(80);
    expect(p.tardinessDeduction).toBeCloseTo(100, 2);
  });
  it('excludes de-minimis and non-taxable bonus from tax base', () => {
    const emp = makeEmployee({
      allowances: [{ id: 'a1', name: 'Rice', amount: 2000, isTaxable: false }],
    });
    const a = calculatePhilippinePayslip(emp, { ...baseOpts, bonus: 5000 });
    const b = calculatePhilippinePayslip(emp, { ...baseOpts, bonus: 5000, nonTaxableBonus: 5000 });
    expect(b.statutory.withholdingTax).toBeLessThanOrEqual(a.statutory.withholdingTax);
    expect(b.grossEarnings).toBe(a.grossEarnings);
  });
  it('never returns negative gross/net and counts scheduled work days', () => {
    const emp = makeEmployee({ monthlyRate: 12000, hourlyRate: 50 });
    const p = calculatePhilippinePayslip(emp, { ...baseOpts, tardinessMinutes: 100000 });
    expect(p.grossEarnings).toBeGreaterThanOrEqual(0);
    expect(p.netPay).toBeGreaterThanOrEqual(0);
    // Default 6-day schedule, Sunday rest: Sep 1-15 2026 => 13 work days
    expect(p.daysWorked).toBe(13);
    const fiveDay = calculatePhilippinePayslip(
      makeEmployee({ workSchedule: { restDay: 0, daysPerWeek: 5 } }),
      baseOpts,
    );
    expect(fiveDay.daysWorked).toBe(11);
  });
  it('falls back safely on bad dates', () => {
    const p = calculatePhilippinePayslip(makeEmployee(), { ...baseOpts, periodEnd: 'not-a-date' });
    expect(p.daysWorked).toBe(13);
    expect(p.payslipNumber).toContain('PS-000000');
  });
  it('honors daysWorked override and attendanceSourced flag', () => {
    const p = calculatePhilippinePayslip(makeEmployee(), { ...baseOpts, daysWorked: 9, attendanceSourced: true });
    expect(p.daysWorked).toBe(9);
    expect(p.attendanceSourced).toBe(true);
  });
  it('combines tardiness + undertime', () => {
    const emp = makeEmployee({ hourlyRate: 120 });
    const p = calculatePhilippinePayslip(emp, { ...baseOpts, tardinessMinutes: 30, undertimeMinutes: 30 });
    expect(p.tardinessMinutes).toBe(60);
    expect(p.tardinessDeduction).toBe(120);
  });
});

describe('statutoryExempt employees (no benefits yet)', () => {
  it('charges zero SSS/PhilHealth/Pag-IBIG (no minimums) for EE and ER', () => {
    const emp = makeEmployee({ monthlyRate: 12000, statutoryExempt: true });
    const p = calculatePhilippinePayslip(emp, baseOpts);
    expect(p.statutory.sssEmployee).toBe(0);
    expect(p.statutory.sssEmployer).toBe(0);
    expect(p.statutory.philhealthEmployee).toBe(0);
    expect(p.statutory.philhealthEmployer).toBe(0);
    expect(p.statutory.pagibigEmployee).toBe(0);
    expect(p.statutory.pagibigEmployer).toBe(0);
    expect(p.statutoryExempt).toBe(true);
  });
  it('still computes BIR withholding per tax law', () => {
    const emp = makeEmployee({ monthlyRate: 60000, statutoryExempt: true });
    const p = calculatePhilippinePayslip(emp, baseOpts);
    // No EE share to deduct, so taxable base is higher — tax still applies
    expect(p.statutory.withholdingTax).toBeGreaterThan(0);
    expect(p.netPay).toBeCloseTo(p.grossEarnings - p.totalDeductions, 2);
  });
  it('low time-based pay can net the full (reduced) gross', () => {
    const emp = makeEmployee({ monthlyRate: 8000, hourlyRate: 50, statutoryExempt: true });
    const p = calculatePhilippinePayslip(emp, { ...baseOpts, tardinessMinutes: 480 });
    expect(p.statutory.withholdingTax).toBe(0);
    expect(p.totalDeductions).toBe(0);
    expect(p.netPay).toBe(p.grossEarnings);
  });
  it('non-exempt employees are unaffected (minimums still apply)', () => {
    const p = calculatePhilippinePayslip(makeEmployee({ monthlyRate: 8000 }), baseOpts);
    expect(p.statutory.sssEmployee).toBeGreaterThan(0);
    expect(p.statutory.philhealthEmployee).toBeGreaterThan(0);
    expect(p.statutory.pagibigEmployee).toBeGreaterThan(0);
    expect(p.statutoryExempt).toBeUndefined();
  });
});

describe('deriveRates (monthly × 12 / factor, hourly = daily / 8)', () => {
  const FIVE = { restDay: 0, daysPerWeek: 5 } as const;
  it('defaults to the 6-day factor (313)', () => {
    expect(deriveRates(50000)).toMatchObject({ dailyRate: 1916.93, hourlyRate: 239.62 });
  });
  it('uses 261 for an explicit 5-day schedule', () => {
    expect(deriveRates(50000, FIVE)).toMatchObject({ dailyRate: 2298.85, hourlyRate: 287.36 });
    expect(deriveRates(25000, FIVE)).toMatchObject({ dailyRate: 1149.43, hourlyRate: 143.68 });
  });
  it('supports low time-based salaries like P1000', () => {
    expect(deriveRates(1000)).toMatchObject({ dailyRate: 38.34, hourlyRate: 4.79 });
    const p = calculatePhilippinePayslip(makeEmployee({ monthlyRate: 1000, hourlyRate: 4.79 }), baseOpts);
    expect(p.basicPay).toBe(500);
    expect(p.grossEarnings).toBeGreaterThanOrEqual(0);
    expect(p.netPay).toBeGreaterThanOrEqual(0);
  });
  it('guards invalid input', () => {
    expect(deriveRates(0)).toMatchObject({ dailyRate: 0, hourlyRate: 0 });
    expect(deriveRates(NaN).dailyRate).toBe(0);
  });
});

describe('computeWorkingDays', () => {
  const FIVE = { restDay: 0, daysPerWeek: 5 } as const;
  it('defaults to 6-day weeks resting Sunday', () => {
    // Mon Sep 7 to Fri Sep 11 2026 => 5 either way (no weekend inside)
    expect(computeWorkingDays('2026-09-07', '2026-09-11', 'semi-monthly')).toBe(5);
    // Sep 1-15 2026 has Sundays on the 6th and 13th => 13 work days
    expect(computeWorkingDays('2026-09-01', '2026-09-15', 'semi-monthly')).toBe(13);
    // Full September 2026 has 4 Sundays => 26 work days
    expect(computeWorkingDays('2026-09-01', '2026-09-30', 'monthly')).toBe(26);
  });
  it('honors an explicit 5-day schedule', () => {
    expect(computeWorkingDays('2026-09-01', '2026-09-15', 'semi-monthly', FIVE)).toBe(11);
    expect(computeWorkingDays('2026-09-01', '2026-09-30', 'monthly', FIVE)).toBe(22);
  });
  it('honors a custom rest day', () => {
    // 6-day resting Wednesday: 5 Wednesdays in Sep 2026 => 25
    expect(computeWorkingDays('2026-09-01', '2026-09-30', 'monthly', { restDay: 3, daysPerWeek: 6 })).toBe(25);
    // 5-day resting Wednesday: rests Wed + Sun => 30 - 5 - 4 = 21
    expect(computeWorkingDays('2026-09-01', '2026-09-30', 'monthly', { restDay: 3, daysPerWeek: 5 })).toBe(21);
  });
  it('normalizes invalid schedules and falls back safely', () => {
    expect(computeWorkingDays('2026-09-01', '2026-09-15', 'semi-monthly', { restDay: 9, daysPerWeek: 6 })).toBe(13);
    expect(computeWorkingDays('not-a-date', '2026-09-15', 'semi-monthly')).toBe(13);
    expect(computeWorkingDays('not-a-date', '2026-09-15', 'semi-monthly', FIVE)).toBe(11);
    expect(computeWorkingDays('2026-09-15', '2026-09-01', 'monthly')).toBe(26);
  });
});

describe('summarizePayslips', () => {
  it('sums totals without drift', () => {
    const ps = [calculatePhilippinePayslip(makeEmployee(), baseOpts)];
    const t = summarizePayslips(ps);
    expect(t.totalGrossPay).toBe(ps[0].grossEarnings);
    expect(t.totalNetPay).toBe(ps[0].netPay);
  });
});
