import { Router } from 'express';
import { getDb } from '../db/database.js';
import { CompanyProfile } from '../types.js';
import { mapRowToCompany } from './state.js';
import { recordAuditLog } from '../utils/audit.js';

export const companyRouter = Router();

companyRouter.get('/', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM company_profile WHERE id = ?').get('primary') as any;
    if (!row) {
      res.status(404).json({ success: false, error: 'Company profile not found' });
      return;
    }
    res.json({ success: true, data: mapRowToCompany(row) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

companyRouter.put('/', (req, res) => {
  try {
    const data: CompanyProfile = req.body;
    if (!data.name || !data.tin) {
      res.status(400).json({ success: false, error: 'Company name and TIN are required' });
      return;
    }

    const db = getDb();
    const now = new Date().toISOString();

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
      ...data,
      tradingName: data.tradingName || '',
      addressLine2: data.addressLine2 || '',
      updatedAt: now,
    });

    recordAuditLog('UPDATE_COMPANY', 'company_profile', 'primary', { name: data.name });

    const updated = db.prepare('SELECT * FROM company_profile WHERE id = ?').get('primary') as any;
    res.json({ success: true, data: mapRowToCompany(updated) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
