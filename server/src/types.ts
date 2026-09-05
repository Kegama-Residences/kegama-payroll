export type EmploymentType = 'regular' | 'probationary' | 'contractual';
export type PaymentFrequency = 'semi-monthly' | 'monthly';
export type PayrollStatus = 'draft' | 'approved' | 'disbursed';

export interface AllowanceItem {
  id: string;
  name: string;
  amount: number;
  isTaxable: boolean;
}

export interface CustomDeductionItem {
  id: string;
  name: string;
  amount: number;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountType?: 'payroll' | 'savings' | 'e-wallet';
}

export interface GovernmentIds {
  tin: string;
  sss: string;
  philhealth: string;
  pagibig: string;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
  hireDate: string;
  employmentType: EmploymentType;
  monthlyRate: number;
  dailyRate: number;
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
  withholdingTax: number;
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

  daysWorked: number;
  tardinessMinutes?: number;
  undertimeMinutes?: number;
  tardinessDeduction: number;
  overtimeHours: number;
  overtimePay: number;
  nightDiffHours?: number;
  nightDiffPay?: number;
  holidayPay?: number;

  basicPay: number;
  deMinimisTotal: number;
  taxableAllowancesTotal: number;
  allowances: AllowanceItem[];
  bonus: number;
  grossEarnings: number;

  statutory: StatutoryBreakdown;
  customDeductions: CustomDeductionItem[];
  totalDeductions: number;
  netPay: number;

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
  periodName: string;
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
  tin: string;
  sssEmployerNumber: string;
  philhealthEmployerNumber: string;
  pagibigEmployerNumber: string;
  rdoCode: string;
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

export interface AuditLogEntry {
  id?: number;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  createdAt?: string;
}

export interface StoredFileEntry {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  category: 'backup' | 'payslip_pdf' | 'document';
  createdAt: string;
}
