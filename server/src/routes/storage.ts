import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, getDatabaseStats, invalidateDatabaseStatsCache } from '../db/database.js';
import { seedInitialData } from '../db/seed.js';
import { getFullState } from './state.js';
import { recordAuditLog } from '../utils/audit.js';

export const storageRouter = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// In-memory backup cache to prevent repetitive directory disk scans and stat calls
let backupListCache: { data: any[]; totalSizeBytes: number; timestamp: number } | null = null;
const BACKUP_CACHE_TTL_MS = 10000;

function invalidateBackupCache() {
  backupListCache = null;
}

function getCachedBackups() {
  const now = Date.now();
  if (backupListCache && now - backupListCache.timestamp < BACKUP_CACHE_TTL_MS) {
    return backupListCache;
  }

  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR);
  let totalSizeBytes = 0;
  const data = files.map((file) => {
    const fullPath = path.join(BACKUP_DIR, file);
    let size = 0;
    let birthtime = new Date();
    let mtime = new Date();
    try {
      const stat = fs.statSync(fullPath);
      size = stat.size;
      birthtime = stat.birthtime;
      mtime = stat.mtime;
    } catch {}
    totalSizeBytes += size;

    return {
      filename: file,
      sizeBytes: size,
      sizeFormatted: `${(size / 1024).toFixed(1)} KB`,
      createdAt: birthtime.toISOString(),
      modifiedAt: mtime.toISOString(),
      type: file.endsWith('.db') ? 'sqlite_binary' : 'json_export',
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  backupListCache = {
    data,
    totalSizeBytes,
    timestamp: now,
  };
  return backupListCache;
}

// 1. Get Storage & DB Stats
storageRouter.get('/stats', (req, res) => {
  try {
    const stats = getDatabaseStats();
    const backupCache = getCachedBackups();

    res.json({
      success: true,
      data: {
        database: stats,
        storage: {
          backupCount: backupCache.data.length,
          totalBackupSizeBytes: backupCache.totalSizeBytes,
          totalBackupSizeFormatted: `${(backupCache.totalSizeBytes / 1024).toFixed(1)} KB`,
          backupDirectory: BACKUP_DIR,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. List Backups
storageRouter.get('/backups', (req, res) => {
  try {
    const backupCache = getCachedBackups();
    res.json({ success: true, data: backupCache.data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Create Backup (creates both JSON snapshot and SQLite binary snapshot)
storageRouter.post('/backup', async (req, res) => {
  try {
    ensureBackupDir();
    const db = getDb();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // JSON Dump
    const state = getFullState();
    const jsonFilename = `kegama_backup_${timestamp}.json`;
    const jsonFilePath = path.join(BACKUP_DIR, jsonFilename);
    fs.writeFileSync(jsonFilePath, JSON.stringify(state, null, 2), 'utf-8');

    // SQLite Binary Backup using WAL-safe backup API
    const dbFilename = `kegama_snapshot_${timestamp}.db`;
    const dbFilePath = path.join(BACKUP_DIR, dbFilename);
    await db.backup(dbFilePath);

    recordAuditLog('CREATE_BACKUP', 'storage', jsonFilename, { dbFilename });

    res.json({
      success: true,
      message: 'Backup created successfully',
      data: {
        jsonBackup: {
          filename: jsonFilename,
          path: jsonFilePath,
          sizeBytes: fs.statSync(jsonFilePath).size,
        },
        dbSnapshot: {
          filename: dbFilename,
          path: dbFilePath,
          sizeBytes: fs.statSync(dbFilePath).size,
        },
        timestamp,
      },
    });

    invalidateBackupCache();
    invalidateDatabaseStatsCache();
  } catch (err: any) {
    console.error('Backup creation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Download Backup File
storageRouter.get('/backup/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    // Security: sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'Backup file not found' });
      return;
    }

    res.download(filePath, safeFilename);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Restore Database from JSON
storageRouter.post('/restore', (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.company || !Array.isArray(payload.employees)) {
      res.status(400).json({ success: false, error: 'Invalid backup format. Must contain company and employees.' });
      return;
    }

    const db = getDb();
    const now = new Date().toISOString();

    const tx = db.transaction(() => {
      // Clear existing
      db.prepare('DELETE FROM payslips').run();
      db.prepare('DELETE FROM payroll_runs').run();
      db.prepare('DELETE FROM employees').run();
      db.prepare('DELETE FROM company_profile').run();

      // Insert Company
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
        )
      `).run({
        ...payload.company,
        updatedAt: now,
      });

      // Insert Employees
      const insertEmp = db.prepare(`
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
        )
      `);

      for (const emp of payload.employees) {
        insertEmp.run({
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

      // Insert Runs & Payslips
      const insertRun = db.prepare(`
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
      `);

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

      for (const run of payload.payrollRuns || []) {
        insertRun.run({
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
          insertPayslip.run({
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

      recordAuditLog('DATABASE_RESTORE', 'system', 'primary', {
        employeesCount: payload.employees?.length,
        runsCount: payload.payrollRuns?.length,
      });
    });

    tx();

    invalidateBackupCache();
    invalidateDatabaseStatsCache();

    const restoredState = getFullState();
    res.json({
      success: true,
      message: 'Database restored successfully from backup',
      data: restoredState,
    });
  } catch (err: any) {
    console.error('Failed to restore database:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Reset Database to Default Hotel Seed
storageRouter.post('/reset', (req, res) => {
  try {
    const db = getDb();
    seedInitialData(db, true);

    invalidateBackupCache();
    invalidateDatabaseStatsCache();

    const defaultState = getFullState();
    res.json({
      success: true,
      message: 'Database reset to default Kegama Residences hotel dataset',
      data: defaultState,
    });
  } catch (err: any) {
    console.error('Failed to reset database:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. SQLite Database Integrity & Foreign Key Check
storageRouter.get('/integrity', (req, res) => {
  try {
    const db = getDb();
    const integrity = db.pragma('integrity_check');
    const fkErrors = db.pragma('foreign_key_check');
    const isOk =
      Array.isArray(integrity) &&
      integrity.length === 1 &&
      (integrity[0] as any).integrity_check === 'ok' &&
      Array.isArray(fkErrors) &&
      fkErrors.length === 0;

    res.json({
      success: true,
      data: {
        ok: isOk,
        integrity,
        foreignKeyErrors: fkErrors,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

