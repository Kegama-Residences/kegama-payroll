import Database from 'better-sqlite3';

export function initializeSchema(db: Database.Database): void {
  // Execute schema creation inside a transaction
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_profile (
      id TEXT PRIMARY KEY DEFAULT 'primary',
      name TEXT NOT NULL,
      trading_name TEXT DEFAULT '',
      tin TEXT NOT NULL,
      sss_employer_number TEXT NOT NULL,
      philhealth_employer_number TEXT NOT NULL,
      pagibig_employer_number TEXT NOT NULL,
      rdo_code TEXT NOT NULL,
      address_line1 TEXT NOT NULL,
      address_line2 TEXT DEFAULT '',
      city TEXT NOT NULL,
      province TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      authorized_signatory_name TEXT NOT NULL,
      authorized_signatory_title TEXT NOT NULL,
      payslip_footer_text TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      employee_number TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      middle_name TEXT DEFAULT '',
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      job_title TEXT NOT NULL,
      department TEXT NOT NULL,
      hire_date TEXT NOT NULL,
      employment_type TEXT NOT NULL,
      monthly_rate REAL NOT NULL,
      daily_rate REAL NOT NULL,
      hourly_rate REAL NOT NULL,
      government_ids TEXT NOT NULL,
      bank_details TEXT NOT NULL,
      allowances TEXT NOT NULL,
      custom_deductions TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payroll_runs (
      id TEXT PRIMARY KEY,
      period_name TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      crediting_date TEXT NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'semi-monthly',
      status TEXT NOT NULL DEFAULT 'draft',
      total_employees INTEGER NOT NULL DEFAULT 0,
      total_gross_pay REAL NOT NULL DEFAULT 0,
      total_deductions REAL NOT NULL DEFAULT 0,
      total_net_pay REAL NOT NULL DEFAULT 0,
      total_withholding_tax REAL NOT NULL DEFAULT 0,
      total_sss_employee REAL NOT NULL DEFAULT 0,
      total_sss_employer REAL NOT NULL DEFAULT 0,
      total_philhealth_employee REAL NOT NULL DEFAULT 0,
      total_philhealth_employer REAL NOT NULL DEFAULT 0,
      total_pagibig_employee REAL NOT NULL DEFAULT 0,
      total_pagibig_employer REAL NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payslips (
      id TEXT PRIMARY KEY,
      payroll_run_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      employee_number TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      employee_email TEXT NOT NULL,
      job_title TEXT NOT NULL,
      department TEXT NOT NULL,
      employment_type TEXT NOT NULL,
      government_ids TEXT NOT NULL,
      bank_details TEXT NOT NULL,
      days_worked REAL NOT NULL DEFAULT 0,
      tardiness_minutes REAL NOT NULL DEFAULT 0,
      undertime_minutes REAL NOT NULL DEFAULT 0,
      tardiness_deduction REAL NOT NULL DEFAULT 0,
      overtime_hours REAL NOT NULL DEFAULT 0,
      overtime_pay REAL NOT NULL DEFAULT 0,
      night_diff_hours REAL NOT NULL DEFAULT 0,
      night_diff_pay REAL NOT NULL DEFAULT 0,
      holiday_pay REAL NOT NULL DEFAULT 0,
      basic_pay REAL NOT NULL DEFAULT 0,
      de_minimis_total REAL NOT NULL DEFAULT 0,
      taxable_allowances_total REAL NOT NULL DEFAULT 0,
      allowances TEXT NOT NULL,
      bonus REAL NOT NULL DEFAULT 0,
      gross_earnings REAL NOT NULL DEFAULT 0,
      statutory TEXT NOT NULL,
      custom_deductions TEXT NOT NULL,
      total_deductions REAL NOT NULL DEFAULT 0,
      net_pay REAL NOT NULL DEFAULT 0,
      payslip_number TEXT NOT NULL,
      period_name TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      crediting_date TEXT NOT NULL,
      generated_date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_payslips_run_id ON payslips(payroll_run_id);
    CREATE INDEX IF NOT EXISTS idx_payslips_emp_id ON payslips(employee_id);
    CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS storage_files (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}
