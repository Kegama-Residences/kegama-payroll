import Database from 'better-sqlite3';
import { CompanyProfile, Employee } from '../types.js';

export const INITIAL_COMPANY: CompanyProfile = {
  name: 'Kegama Residences, Inc.',
  tradingName: '',
  tin: '009-842-103-000',
  sssEmployerNumber: '03-9123456-7',
  philhealthEmployerNumber: '00-120000000-1',
  pagibigEmployerNumber: '2034-5678-9012',
  rdoCode: 'RDO 044 - Taguig City',
  addressLine1: 'Kegama Tower & Residences, Tower 1',
  addressLine2: '26th Street cor. 9th Avenue, Bonifacio Global City',
  city: 'Taguig City',
  province: 'Metro Manila',
  postalCode: '1634',
  email: 'payroll@kegamaresidences.com',
  phone: '+63 (2) 8876-5400',
  authorizedSignatoryName: 'Ma. Teresa Consunji-Tan',
  authorizedSignatoryTitle: 'Director of Human Resources & Hospitality Operations',
  payslipFooterText: 'Confidential document issued pursuant to DOLE Labor Code Article 103 and BIR Withholding Regulations.',
};

export const INITIAL_EMPLOYEES: Employee[] = [];

export function seedInitialData(db: Database.Database, force: boolean = false): void {
  const companyCheck = db.prepare('SELECT COUNT(*) as count FROM company_profile').get() as { count: number };
  if (companyCheck.count > 0 && !force) {
    return;
  }

  const transaction = db.transaction(() => {
    if (force) {
      db.prepare('DELETE FROM payslips').run();
      db.prepare('DELETE FROM payroll_runs').run();
      db.prepare('DELETE FROM employees').run();
      db.prepare('DELETE FROM company_profile').run();
      db.prepare('DELETE FROM audit_logs').run();
    }

    // Insert Company Profile
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
      )
    `).run({
      ...INITIAL_COMPANY,
      updatedAt: now,
    });

    // Record Audit Log
    db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      force ? 'DATABASE_RESET_CLEAN' : 'SYSTEM_INIT_CLEAN',
      'system',
      'primary',
      JSON.stringify({ note: 'Initialized clean KEGAMA Payroll system' }),
      now
    );
  });

  transaction();
}
