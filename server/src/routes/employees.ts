import { Router } from 'express';
import { getDb } from '../db/database.js';
import { Employee } from '../types.js';
import { mapRowToEmployee } from './state.js';
import { recordAuditLog } from '../utils/audit.js';

export const employeesRouter = Router();

employeesRouter.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM employees ORDER BY employee_number ASC').all();
    res.json({ success: true, data: rows.map(mapRowToEmployee) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

employeesRouter.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id) as any;
    if (!row) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }
    res.json({ success: true, data: mapRowToEmployee(row) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

employeesRouter.post('/', (req, res) => {
  try {
    const emp: Employee = req.body;
    if (!emp.firstName || !emp.lastName || !emp.employeeNumber || !emp.monthlyRate) {
      res.status(400).json({ success: false, error: 'Missing required employee fields' });
      return;
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM employees WHERE employee_number = ?').get(emp.employeeNumber);
    if (existing) {
      res.status(409).json({ success: false, error: `Employee number ${emp.employeeNumber} already exists` });
      return;
    }

    const now = new Date().toISOString();
    const id = emp.id || `emp-${Date.now()}`;

    db.prepare(`
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
    `).run({
      id,
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
      governmentIds: JSON.stringify(emp.governmentIds || {}),
      bankDetails: JSON.stringify(emp.bankDetails || {}),
      allowances: JSON.stringify(emp.allowances || []),
      customDeductions: JSON.stringify(emp.customDeductions || []),
      status: emp.status || 'active',
      createdAt: now,
      updatedAt: now,
    });

    recordAuditLog('CREATE_EMPLOYEE', 'employee', id, { employeeNumber: emp.employeeNumber, name: `${emp.firstName} ${emp.lastName}` });

    const created = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: mapRowToEmployee(created) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

employeesRouter.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const emp: Employee = req.body;
    const db = getDb();

    const existing = db.prepare('SELECT id FROM employees WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE employees SET
        employee_number = @employeeNumber,
        first_name = @firstName,
        last_name = @lastName,
        middle_name = @middleName,
        email = @email,
        phone = @phone,
        job_title = @jobTitle,
        department = @department,
        hire_date = @hireDate,
        employment_type = @employmentType,
        monthly_rate = @monthlyRate,
        daily_rate = @dailyRate,
        hourly_rate = @hourlyRate,
        government_ids = @governmentIds,
        bank_details = @bankDetails,
        allowances = @allowances,
        custom_deductions = @customDeductions,
        status = @status,
        updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
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
      governmentIds: JSON.stringify(emp.governmentIds || {}),
      bankDetails: JSON.stringify(emp.bankDetails || {}),
      allowances: JSON.stringify(emp.allowances || []),
      customDeductions: JSON.stringify(emp.customDeductions || []),
      status: emp.status || 'active',
      updatedAt: now,
    });

    recordAuditLog('UPDATE_EMPLOYEE', 'employee', id, { employeeNumber: emp.employeeNumber, name: `${emp.firstName} ${emp.lastName}` });

    const updated = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    res.json({ success: true, data: mapRowToEmployee(updated) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

employeesRouter.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const existing = db.prepare('SELECT id, employee_number, first_name, last_name FROM employees WHERE id = ?').get(id) as any;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    db.prepare('DELETE FROM employees WHERE id = ?').run(id);

    recordAuditLog('DELETE_EMPLOYEE', 'employee', id, { employeeNumber: existing.employee_number, name: `${existing.first_name} ${existing.last_name}` });

    res.json({ success: true, message: `Employee ${existing.employee_number} deleted` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

employeesRouter.patch('/:id/toggle-status', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const emp = db.prepare('SELECT id, status FROM employees WHERE id = ?').get(id) as any;
    if (!emp) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    const nextStatus = emp.status === 'active' ? 'inactive' : 'active';
    db.prepare('UPDATE employees SET status = ?, updated_at = ? WHERE id = ?').run(nextStatus, new Date().toISOString(), id);

    recordAuditLog('TOGGLE_EMPLOYEE_STATUS', 'employee', id, { status: nextStatus });

    const updated = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    res.json({ success: true, data: mapRowToEmployee(updated) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
