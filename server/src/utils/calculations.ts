import { Employee, PayslipItem, PaymentFrequency, StatutoryBreakdown } from '../types.js';

export interface ComputeOptions {
  periodStart: string;
  periodEnd: string;
  creditingDate: string;
  periodName: string;
  frequency: PaymentFrequency;
  overtimeHours?: number;
  bonus?: number;
  tardinessMinutes?: number;
}

export function computeSSS(monthlyRate: number, frequency: PaymentFrequency): { ee: number; er: number } {
  const msc = Math.min(Math.max(monthlyRate, 4000), 30000);
  const monthlyEE = Math.round(msc * 0.045);
  const monthlyER = Math.round(msc * 0.095);

  const factor = frequency === 'semi-monthly' ? 0.5 : 1;
  return {
    ee: Number((monthlyEE * factor).toFixed(2)),
    er: Number((monthlyER * factor).toFixed(2)),
  };
}

export function computePhilHealth(monthlyRate: number, frequency: PaymentFrequency): { ee: number; er: number } {
  const salary = Math.min(Math.max(monthlyRate, 10000), 100000);
  const monthlyEE = Number((salary * 0.025).toFixed(2));
  const monthlyER = monthlyEE;

  const factor = frequency === 'semi-monthly' ? 0.5 : 1;
  return {
    ee: Number((monthlyEE * factor).toFixed(2)),
    er: Number((monthlyER * factor).toFixed(2)),
  };
}

export function computePagIbig(frequency: PaymentFrequency): { ee: number; er: number } {
  const factor = frequency === 'semi-monthly' ? 0.5 : 1;
  return {
    ee: Number((200 * factor).toFixed(2)),
    er: Number((200 * factor).toFixed(2)),
  };
}

export function computeWithholdingTax(taxableIncome: number, frequency: PaymentFrequency): number {
  if (taxableIncome <= 0) return 0;

  if (frequency === 'semi-monthly') {
    if (taxableIncome <= 10417) return 0;
    if (taxableIncome <= 16666) {
      return Number(((taxableIncome - 10417) * 0.15).toFixed(2));
    }
    if (taxableIncome <= 33332) {
      return Number((937.5 + (taxableIncome - 16667) * 0.20).toFixed(2));
    }
    if (taxableIncome <= 83332) {
      return Number((4270.7 + (taxableIncome - 33333) * 0.25).toFixed(2));
    }
    if (taxableIncome <= 333332) {
      return Number((16770.7 + (taxableIncome - 83333) * 0.30).toFixed(2));
    }
    return Number((91770.7 + (taxableIncome - 333333) * 0.35).toFixed(2));
  } else {
    if (taxableIncome <= 20833) return 0;
    if (taxableIncome <= 33333) {
      return Number(((taxableIncome - 20833) * 0.15).toFixed(2));
    }
    if (taxableIncome <= 66666) {
      return Number((1875 + (taxableIncome - 33334) * 0.20).toFixed(2));
    }
    if (taxableIncome <= 166666) {
      return Number((8541.67 + (taxableIncome - 66667) * 0.25).toFixed(2));
    }
    if (taxableIncome <= 666666) {
      return Number((33541.67 + (taxableIncome - 166667) * 0.30).toFixed(2));
    }
    return Number((183541.67 + (taxableIncome - 666667) * 0.35).toFixed(2));
  }
}

export function calculatePhilippinePayslip(
  employee: Employee,
  options: ComputeOptions
): PayslipItem {
  const isSemiMonthly = options.frequency === 'semi-monthly';
  const baseSalary = isSemiMonthly
    ? Number((employee.monthlyRate / 2).toFixed(2))
    : employee.monthlyRate;

  const tardinessMins = options.tardinessMinutes || 0;
  const minuteRate = employee.hourlyRate / 60;
  const tardinessDeduction = Number((tardinessMins * minuteRate).toFixed(2));

  const otHours = options.overtimeHours || 0;
  const overtimePay = Number((otHours * employee.hourlyRate * 1.25).toFixed(2));

  const factor = isSemiMonthly ? 0.5 : 1;
  const scaledAllowances = employee.allowances.map((al) => ({
    ...al,
    amount: Number((al.amount * factor).toFixed(2)),
  }));

  const deMinimisTotal = Number(
    scaledAllowances
      .filter((a) => !a.isTaxable)
      .reduce((sum, a) => sum + a.amount, 0)
      .toFixed(2)
  );

  const taxableAllowancesTotal = Number(
    scaledAllowances
      .filter((a) => a.isTaxable)
      .reduce((sum, a) => sum + a.amount, 0)
      .toFixed(2)
  );

  const bonusAmount = options.bonus || 0;

  const grossEarnings = Number(
    (baseSalary + overtimePay + deMinimisTotal + taxableAllowancesTotal + bonusAmount - tardinessDeduction).toFixed(2)
  );

  const sss = computeSSS(employee.monthlyRate, options.frequency);
  const philhealth = computePhilHealth(employee.monthlyRate, options.frequency);
  const pagibig = computePagIbig(options.frequency);

  const totalMandatoryEE = sss.ee + philhealth.ee + pagibig.ee;
  const taxableBase = baseSalary - tardinessDeduction + overtimePay + taxableAllowancesTotal;
  const netTaxableIncome = Math.max(0, taxableBase - totalMandatoryEE);

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
    amount: Number((d.amount * factor).toFixed(2)),
  }));

  const customDeductionsSum = customDeductionsScaled.reduce((sum, d) => sum + d.amount, 0);

  const totalDeductions = Number(
    (
      statutory.sssEmployee +
      statutory.philhealthEmployee +
      statutory.pagibigEmployee +
      statutory.withholdingTax +
      customDeductionsSum
    ).toFixed(2)
  );

  const netPay = Number((grossEarnings - totalDeductions).toFixed(2));

  const periodCode = options.periodEnd.replace(/-/g, '').slice(0, 6) + (isSemiMonthly ? (new Date(options.periodEnd).getDate() <= 15 ? 'A' : 'B') : 'M');
  const payslipNumber = `PS-${periodCode}-${employee.employeeNumber}`;

  return {
    id: `ps-${employee.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    employeeId: employee.id,
    employeeNumber: employee.employeeNumber,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    employeeEmail: employee.email,
    jobTitle: employee.jobTitle,
    department: employee.department,
    employmentType: employee.employmentType,
    governmentIds: { ...employee.governmentIds },
    bankDetails: { ...employee.bankDetails },

    daysWorked: isSemiMonthly ? 11 : 22,
    tardinessMinutes: tardinessMins,
    tardinessDeduction,
    overtimeHours: otHours,
    overtimePay,

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
    generatedDate: options.creditingDate,
    paymentMethod: 'Bank Direct Deposit (BACS/PESONet)',
  };
}
