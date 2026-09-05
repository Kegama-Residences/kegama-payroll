export type EmploymentType = 'regular' | 'probationary' | 'contractual';
export type PaymentFrequency = 'semi-monthly' | 'monthly';
export type PayrollStatus = 'draft' | 'approved' | 'disbursed';

export interface AllowanceItem {
  id: string;
  name: string;
  amount: number;
  isTaxable: boolean; // De Minimis benefits are non-taxable under BIR rules
}

export interface CustomDeductionItem {
  id: string;
  name: string;
  amount: number;
}

export interface BankDetails {
  bankName: string; // e.g. BDO Unibank, BPI, UnionBank, Metrobank, Maya, GCash
  accountNumber: string;
  accountType?: 'payroll' | 'savings' | 'e-wallet';
}

export interface GovernmentIds {
  tin: string; // Tax Identification Number (e.g. 123-456-789-000)
  sss: string; // Social Security System (e.g. 04-1234567-8)
  philhealth: string; // PhilHealth PIN (e.g. 12-123456789-0)
  pagibig: string; // Pag-IBIG / HDMF MID (e.g. 1234-5678-9012)
}

export interface Employee {
  id: string;
  employeeNumber: string; // e.g. KGM-PH-0101
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
  hireDate: string;
  employmentType: EmploymentType;
  monthlyRate: number; // Base Monthly Salary in PHP (₱)
  dailyRate: number;   // Computed based on standard 261 or 313 days
  hourlyRate: number;
  governmentIds: GovernmentIds;
  bankDetails: BankDetails;
  allowances: AllowanceItem[];
  customDeductions: CustomDeductionItem[];
  status: 'active' | 'inactive';
}

export interface StatutoryBreakdown {
  sssEmployee: number;
  sssEmployer: number;
  philhealthEmployee: number;
  philhealthEmployer: number;
  pagibigEmployee: number;
  pagibigEmployer: number;
  withholdingTax: number; // BIR Withholding Tax (TRAIN Law)
}

export interface PayslipItem {
  id: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  employeeEmail: string;
  jobTitle: string;
  department: string;
  employmentType: EmploymentType;
  governmentIds: GovernmentIds;
  bankDetails: BankDetails;

  // Period Days & Hours
  daysWorked: number;
  tardinessMinutes?: number;
  undertimeMinutes?: number;
  tardinessDeduction: number;
  
  overtimeHours: number;
  overtimePay: number;
  nightDiffHours?: number;
  nightDiffPay?: number;
  holidayPay?: number;

  // Earnings Breakdown
  basicPay: number; // Semi-monthly or monthly basic
  deMinimisTotal: number; // Non-taxable benefits
  taxableAllowancesTotal: number;
  allowances: AllowanceItem[];
  bonus: number; // 13th month pay accrual, performance bonus, or commission
  grossEarnings: number;

  // Deductions Breakdown
  statutory: StatutoryBreakdown;
  customDeductions: CustomDeductionItem[];
  totalDeductions: number;

  // Net Take-Home Pay
  netPay: number;

  // Metadata
  payslipNumber: string;
  periodName: string;
  periodStart: string;
  periodEnd: string;
  creditingDate: string;
  generatedDate: string;
  paymentMethod: string;
}

export interface PayrollRun {
  id: string;
  periodName: string; // e.g. "September 1-15, 2026 (1st Cut-Off)"
  periodStart: string;
  periodEnd: string;
  creditingDate: string;
  frequency: PaymentFrequency;
  status: PayrollStatus;
  createdAt: string;
  updatedAt: string;
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  totalWithholdingTax: number;
  totalSssEmployee: number;
  totalSssEmployer: number;
  totalPhilhealthEmployee: number;
  totalPhilhealthEmployer: number;
  totalPagibigEmployee: number;
  totalPagibigEmployer: number;
  payslips: PayslipItem[];
  notes?: string;
}

export interface CompanyProfile {
  name: string;
  tradingName: string;
  tin: string; // BIR TIN
  sssEmployerNumber: string;
  philhealthEmployerNumber: string;
  pagibigEmployerNumber: string;
  rdoCode: string; // BIR Revenue District Office code (e.g. RDO 044 - Taguig)
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  email: string;
  phone: string;
  authorizedSignatoryName: string;
  authorizedSignatoryTitle: string;
  payslipFooterText: string;
}

export interface AppState {
  company: CompanyProfile;
  employees: Employee[];
  payrollRuns: PayrollRun[];
  activePayrollRunId?: string;
}
