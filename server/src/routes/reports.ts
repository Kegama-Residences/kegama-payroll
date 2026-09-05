import { Router } from 'express';
import { getDb } from '../db/database.js';

export const reportsRouter = Router();

reportsRouter.get('/summary', (req, res) => {
  try {
    const db = getDb();
    
    // Aggregated totals across all disbursed or all runs
    const totals = db.prepare(`
      SELECT
        COUNT(id) as total_runs,
        COALESCE(SUM(total_employees), 0) as total_employee_instances,
        COALESCE(SUM(total_gross_pay), 0) as total_gross_pay,
        COALESCE(SUM(total_deductions), 0) as total_deductions,
        COALESCE(SUM(total_net_pay), 0) as total_net_pay,
        COALESCE(SUM(total_withholding_tax), 0) as total_withholding_tax,
        COALESCE(SUM(total_sss_employee), 0) as total_sss_employee,
        COALESCE(SUM(total_sss_employer), 0) as total_sss_employer,
        COALESCE(SUM(total_philhealth_employee), 0) as total_philhealth_employee,
        COALESCE(SUM(total_philhealth_employer), 0) as total_philhealth_employer,
        COALESCE(SUM(total_pagibig_employee), 0) as total_pagibig_employee,
        COALESCE(SUM(total_pagibig_employer), 0) as total_pagibig_employer
      FROM payroll_runs
    `).get() as any;

    const disbursedTotals = db.prepare(`
      SELECT
        COUNT(id) as total_runs,
        COALESCE(SUM(total_gross_pay), 0) as total_gross_pay,
        COALESCE(SUM(total_net_pay), 0) as total_net_pay,
        COALESCE(SUM(total_withholding_tax), 0) as total_withholding_tax,
        COALESCE(SUM(total_sss_employee + total_sss_employer), 0) as total_sss,
        COALESCE(SUM(total_philhealth_employee + total_philhealth_employer), 0) as total_philhealth,
        COALESCE(SUM(total_pagibig_employee + total_pagibig_employer), 0) as total_pagibig
      FROM payroll_runs
      WHERE status = 'disbursed'
    `).get() as any;

    res.json({
      success: true,
      data: {
        allRuns: totals,
        disbursedRuns: disbursedTotals,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

reportsRouter.get('/audit-logs', (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const db = getDb();
    const rows = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?').all(limit);
    res.json({
      success: true,
      data: rows.map((r: any) => ({
        id: r.id,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        details: r.details ? JSON.parse(r.details) : null,
        createdAt: r.created_at,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
