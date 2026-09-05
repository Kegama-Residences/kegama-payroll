import { Router } from 'express';
import { getDb } from '../db/database.js';
import { AppState, CompanyProfile, Employee, PayrollRun, PayslipItem } from '../types.js';
import { recordAuditLog } from '../utils/audit.js';

export const stateRouter = Router();

export function mapRowToEmployee(row: any): Employee {
  return {
    id: row.id,
    employeeNumber: row.employee_number,
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name || undefined,
    email: row.email,
    phone: row.phone,
    jobTitle: row.job_title,
    department: row.department,
    hireDate: row.hire_date,
    employmentType: row.employment_type,
    monthlyRate: row.monthly_rate,
    dailyRate: row.daily_rate,
    hourlyRate: row.hourly_rate,
    governmentIds: JSON.parse(row.government_ids || '{}'),
    bankDetails: JSON.parse(row.bank_details || '{}'),
    allowances: JSON.parse(row.allowances || '[]'),
    customDeductions: JSON.parse(row.custom_deductions || '[]'),
    status: row.status,
  };
}

export function mapRowToPayslip(row: any): PayslipItem {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeNumber: row.employee_number,
    employeeName: row.employee_name,
    employeeEmail: row.employee_email,
    jobTitle: row.job_title,
    department: row.department,
    employmentType: row.employment_type,
    governmentIds: JSON.parse(row.government_ids || '{}'),
    bankDetails: JSON.parse(row.bank_details || '{}'),
    daysWorked: row.days_worked,
    tardinessMinutes: row.tardiness_minutes,
    undertimeMinutes: row.undertime_minutes,
    tardinessDeduction: row.tardiness_deduction,
    overtimeHours: row.overtime_hours,
    overtimePay: row.overtime_pay,
    nightDiffHours: row.night_diff_hours,
    nightDiffPay: row.night_diff_pay,
    holidayPay: row.holiday_pay,
    basicPay: row.basic_pay,
    deMinimisTotal: row.de_minimis_total,
    taxableAllowancesTotal: row.taxable_allowances_total,
    allowances: JSON.parse(row.allowances || '[]'),
    bonus: row.bonus,
    grossEarnings: row.gross_earnings,
    statutory: JSON.parse(row.statutory || '{}'),
    customDeductions: JSON.parse(row.custom_deductions || '[]'),
    totalDeductions: row.total_deductions,
    netPay: row.net_pay,
    payslipNumber: row.payslip_number,
    periodName: row.period_name,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    creditingDate: row.crediting_date,
    generatedDate: row.generated_date,
    paymentMethod: row.payment_method,
  };
}

export function mapRowToCompany(row: any): CompanyProfile {
  return {
    name: row.name,
    tradingName: row.trading_name || '',
    tin: row.tin,
    sssEmployerNumber: row.sss_employer_number,
    philhealthEmployerNumber: row.philhealth_employer_number,
    pagibigEmployerNumber: row.pagibig_employer_number,
    rdoCode: row.rdo_code,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2 || '',
    city: row.city,
    province: row.province,
    postalCode: row.postal_code,
    email: row.email,
    phone: row.phone,
    authorizedSignatoryName: row.authorized_signatory_name,
    authorizedSignatoryTitle: row.authorized_signatory_title,
    payslipFooterText: row.payslip_footer_text,
  };
}

export function getFullState(): AppState {
  const db = getDb();

  // Company
  const companyRow = db.prepare('SELECT * FROM company_profile WHERE id = ?').get('primary') as any;
  const company = companyRow ? mapRowToCompany(companyRow) : ({} as CompanyProfile);

  // Employees
  const employeeRows = db.prepare('SELECT * FROM employees ORDER BY employee_number ASC').all();
  const employees = employeeRows.map(mapRowToEmployee);

  // Payroll Runs & Payslips
  const runRows = db.prepare('SELECT * FROM payroll_runs ORDER BY period_end DESC, created_at DESC').all() as any[];
  const payslipRows = db.prepare('SELECT * FROM payslips ORDER BY employee_number ASC').all() as any[];

  const payslipsByRun = new Map<string, PayslipItem[]>();
  for (const row of payslipRows) {
    const list = payslipsByRun.get(row.payroll_run_id) || [];
    list.push(mapRowToPayslip(row));
    payslipsByRun.set(row.payroll_run_id, list);
  }

  const payrollRuns: PayrollRun[] = runRows.map((r) => ({
    id: r.id,
    periodName: r.period_name,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    creditingDate: r.crediting_date,
    frequency: r.frequency,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    totalEmployees: r.total_employees,
    totalGrossPay: r.total_gross_pay,
    totalDeductions: r.total_deductions,
    totalNetPay: r.total_net_pay,
    totalWithholdingTax: r.total_withholding_tax,
    totalSssEmployee: r.total_sss_employee,
    totalSssEmployer: r.total_sss_employer,
    totalPhilhealthEmployee: r.total_philhealth_employee,
    totalPhilhealthEmployer: r.total_philhealth_employer,
    totalPagibigEmployee: r.total_pagibig_employee,
    totalPagibigEmployer: r.total_pagibig_employer,
    notes: r.notes || '',
    payslips: payslipsByRun.get(r.id) || [],
  }));

  return {
    company,
    employees,
    payrollRuns,
    activePayrollRunId: payrollRuns[0]?.id,
  };
}

stateRouter.get('/', (req, res) => {
  try {
    const state = getFullState();
    res.json({
      success: true,
      data: state,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Failed to get state:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

stateRouter.post('/sync', (req, res) => {
  try {
    const incoming: AppState = req.body;
    if (!incoming || !incoming.company) {
      res.status(400).json({ success: false, error: 'Invalid state payload' });
      return;
    }

    const db = getDb();
    const now = new Date().toISOString();

    const tx = db.transaction(() => {
      // 1. Sync Company
      db.prepare(`
        INSERT INTO company_profile (
          id, name, trading_name, tin, sss_employer_number, philhealth_employer_number,
          pagibig_employer_number, rdo_code, address_line1, address_line2, city, province,
          postal_code, email, phone, authorized_signatory_name, authorized_signatory_title,
          payslip_footer_text, updated_at
        ) VALUES (
          'primary', @name, @tradingName, @tin, @sssEmployerNumber, @philhealthEmployerNumber,
          @pagibigEmployerNumber, @rdoCode, @addressLine1, @addressLine2, @city, @province,
          @postalCode, @email, @phone, @authorizedSignatoryName, @authorizedSignatoryTitle,
          @payslipFooterText, @updatedAt
        ) ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          trading_name = excluded.trading_name,
          tin = excluded.tin,
          sss_employer_number = excluded.sss_employer_number,
          philhealth_employer_number = excluded.philhealth_employer_number,
          pagibig_employer_number = excluded.pagibig_employer_number,
          rdo_code = excluded.rdo_code,
          address_line1 = excluded.address_line1,
          address_line2 = excluded.address_line2,
          city = excluded.city,
          province = excluded.province,
          postal_code = excluded.postal_code,
          email = excluded.email,
          phone = excluded.phone,
          authorized_signatory_name = excluded.authorized_signatory_name,
          authorized_signatory_title = excluded.authorized_signatory_title,
          payslip_footer_text = excluded.payslip_footer_text,
          updated_at = excluded.updated_at
      `).run({
        ...incoming.company,
        updatedAt: now,
      });

      // 2. Sync Employees
      const upsertEmployee = db.prepare(`
        INSERT INTO employees (
          id, employee_number, first_name, last_name, middle_name, email, phone,
          job_title, department, hire_date, employment_type, monthly_rate, daily_rate,
          hourly_rate, government_ids, bank_details, allowances, custom_deductions,
          status, created_at, updated_at
        ) VALUES (
          @id, @employeeNumber, @firstName, @lastName, @middleName, @email, @phone,
          @jobTitle, @department, @hireDate, @employmentType, @monthlyRate, @dailyRate,
          @hourlyRate, @governmentIds, @bankDetails, @allowances, @customDeductions,
          @status, @createdAt, @updatedAt
        ) ON CONFLICT(id) DO UPDATE SET
          employee_number = excluded.employee_number,
          first_name = excluded.first_name,
          last_name = excluded.last_name,
          middle_name = excluded.middle_name,
          email = excluded.email,
          phone = excluded.phone,
          job_title = excluded.job_title,
          department = excluded.department,
          hire_date = excluded.hire_date,
          employment_type = excluded.employment_type,
          monthly_rate = excluded.monthly_rate,
          daily_rate = excluded.daily_rate,
          hourly_rate = excluded.hourly_rate,
          government_ids = excluded.government_ids,
          bank_details = excluded.bank_details,
          allowances = excluded.allowances,
          custom_deductions = excluded.custom_deductions,
          status = excluded.status,
          updated_at = excluded.updated_at
      `);

      for (const emp of incoming.employees || []) {
        upsertEmployee.run({
          id: emp.id,
          employeeNumber: emp.employeeNumber,
          firstName: emp.firstName,
          lastName: emp.lastName,
          middleName: emp.middleName || '',
          email: emp.email,
          phone: emp.phone,
          jobTitle: emp.jobTitle,
          department: emp.department,
          hireDate: emp.hireDate,
          employmentType: emp.employmentType,
          monthlyRate: emp.monthlyRate,
          dailyRate: emp.dailyRate,
          hourlyRate: emp.hourlyRate,
          governmentIds: JSON.stringify(emp.governmentIds),
          bankDetails: JSON.stringify(emp.bankDetails),
          allowances: JSON.stringify(emp.allowances),
          customDeductions: JSON.stringify(emp.customDeductions),
          status: emp.status,
          createdAt: now,
          updatedAt: now,
        });
      }

      // 3. Sync Runs
      const upsertRun = db.prepare(`
        INSERT INTO payroll_runs (
          id, period_name, period_start, period_end, crediting_date, frequency, status,
          total_employees, total_gross_pay, total_deductions, total_net_pay,
          total_withholding_tax, total_sss_employee, total_sss_employer,
          total_philhealth_employee, total_philhealth_employer, total_pagibig_employee,
          total_pagibig_employer, notes, created_at, updated_at
        ) VALUES (
          @id, @periodName, @periodStart, @periodEnd, @creditingDate, @frequency, @status,
          @totalEmployees, @totalGrossPay, @totalDeductions, @totalNetPay,
          @totalWithholdingTax, @totalSssEmployee, @totalSssEmployer,
          @totalPhilhealthEmployee, @totalPhilhealthEmployer, @totalPagibigEmployee,
          @totalPagibigEmployer, @notes, @createdAt, @updatedAt
        ) ON CONFLICT(id) DO UPDATE SET
          period_name = excluded.period_name,
          period_start = excluded.period_start,
          period_end = excluded.period_end,
          crediting_date = excluded.crediting_date,
          frequency = excluded.frequency,
          status = excluded.status,
          total_employees = excluded.total_employees,
          total_gross_pay = excluded.total_gross_pay,
          total_deductions = excluded.total_deductions,
          total_net_pay = excluded.total_net_pay,
          total_withholding_tax = excluded.total_withholding_tax,
          total_sss_employee = excluded.total_sss_employee,
          total_sss_employer = excluded.total_sss_employer,
          total_philhealth_employee = excluded.total_philhealth_employee,
          total_philhealth_employer = excluded.total_philhealth_employer,
          total_pagibig_employee = excluded.total_pagibig_employee,
          total_pagibig_employer = excluded.total_pagibig_employer,
          notes = excluded.notes,
          updated_at = excluded.updated_at
      `);

      const upsertPayslip = db.prepare(`
        INSERT INTO payslips (
          id, payroll_run_id, employee_id, employee_number, employee_name, employee_email,
          job_title, department, employment_type, government_ids, bank_details,
          days_worked, tardiness_minutes, undertime_minutes, tardiness_deduction,
          overtime_hours, overtime_pay, night_diff_hours, night_diff_pay, holiday_pay,
          basic_pay, de_minimis_total, taxable_allowances_total, allowances, bonus,
          gross_earnings, statutory, custom_deductions, total_deductions, net_pay,
          payslip_number, period_name, period_start, period_end, crediting_date,
          generated_date, payment_method, created_at, updated_at
        ) VALUES (
          @id, @payrollRunId, @employeeId, @employeeNumber, @employeeName, @employeeEmail,
          @jobTitle, @department, @employmentType, @governmentIds, @bankDetails,
          @daysWorked, @tardinessMinutes, @undertimeMinutes, @tardinessDeduction,
          @overtimeHours, @overtimePay, @nightDiffHours, @nightDiffPay, @holidayPay,
          @basicPay, @deMinimisTotal, @taxableAllowancesTotal, @allowances, @bonus,
          @grossEarnings, @statutory, @customDeductions, @totalDeductions, @netPay,
          @payslipNumber, @periodName, @periodStart, @periodEnd, @creditingDate,
          @generatedDate, @paymentMethod, @createdAt, @updatedAt
        ) ON CONFLICT(id) DO UPDATE SET
          employee_name = excluded.employee_name,
          employee_email = excluded.employee_email,
          job_title = excluded.job_title,
          department = excluded.department,
          employment_type = excluded.employment_type,
          government_ids = excluded.government_ids,
          bank_details = excluded.bank_details,
          days_worked = excluded.days_worked,
          tardiness_minutes = excluded.tardiness_minutes,
          undertime_minutes = excluded.undertime_minutes,
          tardiness_deduction = excluded.tardiness_deduction,
          overtime_hours = excluded.overtime_hours,
          overtimePay = excluded.overtime_pay,
          night_diff_hours = excluded.night_diff_hours,
          night_diff_pay = excluded.night_diff_pay,
          holiday_pay = excluded.holiday_pay,
          basic_pay = excluded.basic_pay,
          de_minimis_total = excluded.de_minimis_total,
          taxable_allowances_total = excluded.taxable_allowances_total,
          allowances = excluded.allowances,
          bonus = excluded.bonus,
          gross_earnings = excluded.gross_earnings,
          statutory = excluded.statutory,
          custom_deductions = excluded.custom_deductions,
          total_deductions = excluded.total_deductions,
          net_pay = excluded.net_pay,
          updated_at = excluded.updated_at
      `);

      for (const run of incoming.payrollRuns || []) {
        upsertRun.run({
          id: run.id,
          periodName: run.periodName,
          periodStart: run.periodStart,
          periodEnd: run.periodEnd,
          creditingDate: run.creditingDate,
          frequency: run.frequency,
          status: run.status,
          totalEmployees: run.totalEmployees,
          totalGrossPay: run.totalGrossPay,
          totalDeductions: run.totalDeductions,
          totalNetPay: run.totalNetPay,
          totalWithholdingTax: run.totalWithholdingTax,
          totalSssEmployee: run.totalSssEmployee,
          totalSssEmployer: run.totalSssEmployer,
          totalPhilhealthEmployee: run.totalPhilhealthEmployee,
          totalPhilhealthEmployer: run.totalPhilhealthEmployer,
          totalPagibigEmployee: run.totalPagibigEmployee,
          totalPagibigEmployer: run.totalPagibigEmployer,
          notes: run.notes || '',
          createdAt: run.createdAt || now,
          updatedAt: run.updatedAt || now,
        });

        for (const p of run.payslips || []) {
          upsertPayslip.run({
            id: p.id,
            payrollRunId: run.id,
            employeeId: p.employeeId,
            employeeNumber: p.employeeNumber,
            employeeName: p.employeeName,
            employeeEmail: p.employeeEmail,
            jobTitle: p.jobTitle,
            department: p.department,
            employmentType: p.employmentType,
            governmentIds: JSON.stringify(p.governmentIds),
            bankDetails: JSON.stringify(p.bankDetails),
            daysWorked: p.daysWorked,
            tardinessMinutes: p.tardinessMinutes || 0,
            undertimeMinutes: p.undertimeMinutes || 0,
            tardinessDeduction: p.tardinessDeduction,
            overtimeHours: p.overtimeHours,
            overtimePay: p.overtimePay,
            nightDiffHours: p.nightDiffHours || 0,
            nightDiffPay: p.nightDiffPay || 0,
            holidayPay: p.holidayPay || 0,
            basicPay: p.basicPay,
            deMinimisTotal: p.deMinimisTotal,
            taxableAllowancesTotal: p.taxableAllowancesTotal,
            allowances: JSON.stringify(p.allowances),
            bonus: p.bonus,
            grossEarnings: p.grossEarnings,
            statutory: JSON.stringify(p.statutory),
            customDeductions: JSON.stringify(p.customDeductions),
            totalDeductions: p.totalDeductions,
            netPay: p.netPay,
            payslipNumber: p.payslipNumber,
            periodName: p.periodName,
            periodStart: p.periodStart,
            periodEnd: p.periodEnd,
            creditingDate: p.creditingDate,
            generatedDate: p.generatedDate,
            paymentMethod: p.paymentMethod,
            createdAt: p.generatedDate || now,
            updatedAt: now,
          });
        }
      }

      recordAuditLog('STATE_SYNC', 'system', 'primary', { countRuns: incoming.payrollRuns?.length });
    });

    tx();

    const updatedState = getFullState();
    res.json({
      success: true,
      message: 'State synced successfully with SQLite database',
      data: updatedState,
    });
  } catch (err: any) {
    console.error('Failed to sync state:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
