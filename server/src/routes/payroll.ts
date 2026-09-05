import { Router } from 'express';
import { getDb } from '../db/database.js';
import { PayrollRun, PayslipItem, PayrollStatus } from '../types.js';
import { mapRowToPayslip } from './state.js';
import { recordAuditLog } from '../utils/audit.js';

export const payrollRouter = Router();

function fetchRunById(id: string): PayrollRun | null {
  const db = getDb();
  const r = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(id) as any;
  if (!r) return null;

  const payslipRows = db.prepare('SELECT * FROM payslips WHERE payroll_run_id = ? ORDER BY employee_number ASC').all(id) as any[];
  const payslips = payslipRows.map(mapRowToPayslip);

  return {
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
    payslips,
  };
}

payrollRouter.get('/runs', (req, res) => {
  try {
    const db = getDb();
    const runRows = db.prepare('SELECT * FROM payroll_runs ORDER BY period_end DESC, created_at DESC').all() as any[];
    const payslipRows = db.prepare('SELECT * FROM payslips ORDER BY employee_number ASC').all() as any[];

    const payslipsByRun = new Map<string, PayslipItem[]>();
    for (const row of payslipRows) {
      const list = payslipsByRun.get(row.payroll_run_id) || [];
      list.push(mapRowToPayslip(row));
      payslipsByRun.set(row.payroll_run_id, list);
    }

    const runs: PayrollRun[] = runRows.map((r) => ({
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

    res.json({ success: true, data: runs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

payrollRouter.get('/runs/:id', (req, res) => {
  try {
    const run = fetchRunById(req.params.id);
    if (!run) {
      res.status(404).json({ success: false, error: 'Payroll run not found' });
      return;
    }
    res.json({ success: true, data: run });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

payrollRouter.post('/runs', (req, res) => {
  try {
    const newRun: PayrollRun = req.body;
    if (!newRun.id || !newRun.periodName || !newRun.periodStart || !newRun.periodEnd) {
      res.status(400).json({ success: false, error: 'Missing required payroll run details' });
      return;
    }

    const db = getDb();
    const now = new Date().toISOString();

    const tx = db.transaction(() => {
      // Insert run
      db.prepare(`
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
        )
      `).run({
        id: newRun.id,
        periodName: newRun.periodName,
        periodStart: newRun.periodStart,
        periodEnd: newRun.periodEnd,
        creditingDate: newRun.creditingDate,
        frequency: newRun.frequency,
        status: newRun.status || 'draft',
        totalEmployees: newRun.payslips?.length || newRun.totalEmployees || 0,
        totalGrossPay: newRun.totalGrossPay || 0,
        totalDeductions: newRun.totalDeductions || 0,
        totalNetPay: newRun.totalNetPay || 0,
        totalWithholdingTax: newRun.totalWithholdingTax || 0,
        totalSssEmployee: newRun.totalSssEmployee || 0,
        totalSssEmployer: newRun.totalSssEmployer || 0,
        totalPhilhealthEmployee: newRun.totalPhilhealthEmployee || 0,
        totalPhilhealthEmployer: newRun.totalPhilhealthEmployer || 0,
        totalPagibigEmployee: newRun.totalPagibigEmployee || 0,
        totalPagibigEmployer: newRun.totalPagibigEmployer || 0,
        notes: newRun.notes || '',
        createdAt: newRun.createdAt || now,
        updatedAt: now,
      });

      // Insert payslips
      const insertPayslip = db.prepare(`
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
        )
      `);

      for (const p of newRun.payslips || []) {
        insertPayslip.run({
          id: p.id,
          payrollRunId: newRun.id,
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
          createdAt: now,
          updatedAt: now,
        });
      }

      recordAuditLog('CREATE_PAYROLL_RUN', 'payroll_run', newRun.id, {
        periodName: newRun.periodName,
        totalNetPay: newRun.totalNetPay,
      });
    });

    tx();

    const created = fetchRunById(newRun.id);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    console.error('Failed to create payroll run:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

payrollRouter.put('/runs/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: PayrollStatus };

    if (!['draft', 'approved', 'disbursed'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid payroll status' });
      return;
    }

    const db = getDb();
    const existing = db.prepare('SELECT id, period_name FROM payroll_runs WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Payroll run not found' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE payroll_runs SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);

    recordAuditLog('UPDATE_PAYROLL_STATUS', 'payroll_run', id, { status, periodName: existing.period_name });

    const updated = fetchRunById(id);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

payrollRouter.delete('/runs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const existing = db.prepare('SELECT id, period_name FROM payroll_runs WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Payroll run not found' });
      return;
    }

    // ON DELETE CASCADE deletes all associated payslips
    db.prepare('DELETE FROM payroll_runs WHERE id = ?').run(id);

    recordAuditLog('DELETE_PAYROLL_RUN', 'payroll_run', id, { periodName: existing.period_name });

    res.json({ success: true, message: `Payroll run ${existing.period_name} deleted` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

payrollRouter.put('/runs/:runId/payslips/:id', (req, res) => {
  try {
    const { runId, id } = req.params;
    const updated: PayslipItem = req.body;
    const db = getDb();
    const now = new Date().toISOString();

    const tx = db.transaction(() => {
      // 1. Update payslip
      db.prepare(`
        UPDATE payslips SET
          employee_name = @employeeName,
          employee_email = @employeeEmail,
          job_title = @jobTitle,
          department = @department,
          employment_type = @employmentType,
          government_ids = @governmentIds,
          bank_details = @bankDetails,
          days_worked = @daysWorked,
          tardiness_minutes = @tardinessMinutes,
          undertime_minutes = @undertimeMinutes,
          tardiness_deduction = @tardinessDeduction,
          overtime_hours = @overtimeHours,
          overtime_pay = @overtimePay,
          night_diff_hours = @nightDiffHours,
          night_diff_pay = @nightDiffPay,
          holiday_pay = @holidayPay,
          basic_pay = @basicPay,
          de_minimis_total = @deMinimisTotal,
          taxable_allowances_total = @taxableAllowancesTotal,
          allowances = @allowances,
          bonus = @bonus,
          gross_earnings = @grossEarnings,
          statutory = @statutory,
          custom_deductions = @customDeductions,
          total_deductions = @totalDeductions,
          net_pay = @netPay,
          updated_at = @updatedAt
        WHERE id = @id AND payroll_run_id = @runId
      `).run({
        id,
        runId,
        employeeName: updated.employeeName,
        employeeEmail: updated.employeeEmail,
        jobTitle: updated.jobTitle,
        department: updated.department,
        employmentType: updated.employmentType,
        governmentIds: JSON.stringify(updated.governmentIds),
        bankDetails: JSON.stringify(updated.bankDetails),
        daysWorked: updated.daysWorked,
        tardinessMinutes: updated.tardinessMinutes || 0,
        undertimeMinutes: updated.undertimeMinutes || 0,
        tardinessDeduction: updated.tardinessDeduction,
        overtimeHours: updated.overtimeHours,
        overtimePay: updated.overtimePay,
        nightDiffHours: updated.nightDiffHours || 0,
        nightDiffPay: updated.nightDiffPay || 0,
        holidayPay: updated.holidayPay || 0,
        basicPay: updated.basicPay,
        deMinimisTotal: updated.deMinimisTotal,
        taxableAllowancesTotal: updated.taxableAllowancesTotal,
        allowances: JSON.stringify(updated.allowances),
        bonus: updated.bonus,
        grossEarnings: updated.grossEarnings,
        statutory: JSON.stringify(updated.statutory),
        customDeductions: JSON.stringify(updated.customDeductions),
        totalDeductions: updated.totalDeductions,
        netPay: updated.netPay,
        updatedAt: now,
      });

      // 2. Recalculate Run Totals
      const payslips = db.prepare('SELECT * FROM payslips WHERE payroll_run_id = ?').all(runId) as any[];
      const mapped = payslips.map(mapRowToPayslip);

      const totalGrossPay = Number(mapped.reduce((s, p) => s + p.grossEarnings, 0).toFixed(2));
      const totalDeductions = Number(mapped.reduce((s, p) => s + p.totalDeductions, 0).toFixed(2));
      const totalNetPay = Number(mapped.reduce((s, p) => s + p.netPay, 0).toFixed(2));
      const totalWithholdingTax = Number(mapped.reduce((s, p) => s + p.statutory.withholdingTax, 0).toFixed(2));
      const totalSssEmployee = Number(mapped.reduce((s, p) => s + p.statutory.sssEmployee, 0).toFixed(2));
      const totalSssEmployer = Number(mapped.reduce((s, p) => s + p.statutory.sssEmployer, 0).toFixed(2));
      const totalPhilhealthEmployee = Number(mapped.reduce((s, p) => s + p.statutory.philhealthEmployee, 0).toFixed(2));
      const totalPhilhealthEmployer = Number(mapped.reduce((s, p) => s + p.statutory.philhealthEmployer, 0).toFixed(2));
      const totalPagibigEmployee = Number(mapped.reduce((s, p) => s + p.statutory.pagibigEmployee, 0).toFixed(2));
      const totalPagibigEmployer = Number(mapped.reduce((s, p) => s + p.statutory.pagibigEmployer, 0).toFixed(2));

      db.prepare(`
        UPDATE payroll_runs SET
          total_gross_pay = @totalGrossPay,
          total_deductions = @totalDeductions,
          total_net_pay = @totalNetPay,
          total_withholding_tax = @totalWithholdingTax,
          total_sss_employee = @totalSssEmployee,
          total_sss_employer = @totalSssEmployer,
          total_philhealth_employee = @totalPhilhealthEmployee,
          total_philhealth_employer = @totalPhilhealthEmployer,
          total_pagibig_employee = @totalPagibigEmployee,
          total_pagibig_employer = @totalPagibigEmployer,
          updated_at = @updatedAt
        WHERE id = @runId
      `).run({
        runId,
        totalGrossPay,
        totalDeductions,
        totalNetPay,
        totalWithholdingTax,
        totalSssEmployee,
        totalSssEmployer,
        totalPhilhealthEmployee,
        totalPhilhealthEmployer,
        totalPagibigEmployee,
        totalPagibigEmployer,
        updatedAt: now,
      });

      recordAuditLog('UPDATE_PAYSLIP', 'payslip', id, { runId, employeeNumber: updated.employeeNumber, netPay: updated.netPay });
    });

    tx();

    const updatedRun = fetchRunById(runId);
    res.json({ success: true, data: updatedRun });
  } catch (err: any) {
    console.error('Failed to update payslip:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
