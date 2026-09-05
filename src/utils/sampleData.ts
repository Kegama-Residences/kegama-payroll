import { CompanyProfile, Employee, PayrollRun } from '../types/payroll';

export const SAMPLE_COMPANY: CompanyProfile = {
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

export const SAMPLE_EMPLOYEES: Employee[] = [];

export function generateInitialPhilippineRuns(): PayrollRun[] {
  return [];
}
