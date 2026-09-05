import React, { useEffect, useState } from 'react';
import { CompanyProfile, PayslipItem } from '../../types/payroll';
import { formatPHP, formatDate } from '../../utils/currency';
import { generateQRCodeDataUrl } from '../../utils/qrGenerator';
import { BrandLogo } from '../common/BrandLogo';

interface PayslipDocumentProps {
  payslip: PayslipItem;
  company: CompanyProfile;
  elementId?: string;
  layout?: 'full' | 'quarter'; // 'full' = 1 per letter page, 'quarter' = 4 per letter page
}

export const PayslipDocument: React.FC<PayslipDocumentProps> = ({
  payslip,
  company,
  elementId = `payslip-doc-${payslip.id}`,
  layout = 'full',
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    const payload = JSON.stringify({
      ref: payslip.payslipNumber,
      emp: payslip.employeeName,
      id: payslip.employeeNumber,
      tin: payslip.governmentIds.tin,
      net: formatPHP(payslip.netPay),
      period: `${payslip.periodStart} to ${payslip.periodEnd}`,
      co: company.name,
      tinCo: company.tin,
    });

    generateQRCodeDataUrl(payload).then((url) => {
      setQrCodeUrl(url);
    });
  }, [payslip, company]);

  const stat = payslip.statutory;

  // -------------------------------------------------------------
  // LAYOUT 1: QUARTER SHEET (4-IN-1 LETTER PAGE - 2x2 GRID)
  // Dimensions calibrated to fit 4 vouchers precisely on US Letter
  // -------------------------------------------------------------
  if (layout === 'quarter') {
    return (
      <div
        id={elementId}
        className="bg-white text-slate-900 border border-dashed border-orange-400 p-3 flex flex-col justify-between h-full font-sans text-[10px] leading-tight select-none relative overflow-hidden"
      >
        {/* Scissor Cut Mark at Corner */}
        <div className="absolute top-1 right-1 text-[8px] text-orange-500 font-mono flex items-center gap-0.5">
          <span>✂</span>
          <span className="text-[7px]">cut</span>
        </div>

        {/* Top Header */}
        <div>
          <div className="border-b border-orange-500 pb-1 flex justify-between items-start">
            <div className="pr-2">
              <div className="flex items-center gap-1.5">
                <BrandLogo className="w-3.5 h-3.5 text-orange-600 inline-block flex-shrink-0" />
                <h3 className="font-black text-[11px] text-slate-950 uppercase tracking-tight truncate max-w-[180px]">
                  {company.name}
                </h3>
              </div>
              <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                TIN: {company.tin} • SSS: {company.sssEmployerNumber}
              </p>
            </div>
            <div className="text-right">
              <span className="px-1 py-0.2 rounded bg-orange-100 text-orange-900 font-bold text-[8px] uppercase tracking-wider block">
                PAYSLIP
              </span>
              <span className="font-mono font-bold text-[9px] text-slate-800 block mt-0.5">
                {payslip.payslipNumber}
              </span>
            </div>
          </div>

          {/* Employee & Cut-Off Banner */}
          <div className="bg-orange-50/80 border-y border-orange-200 py-1 px-1.5 my-1 grid grid-cols-2 gap-1 text-[9.5px]">
            <div>
              <span className="text-[8px] text-slate-500 uppercase font-bold block">Employee</span>
              <strong className="text-slate-950 text-[10px] truncate block">{payslip.employeeName}</strong>
              <span className="text-[8.5px] text-slate-600 block truncate">{payslip.jobTitle}</span>
            </div>
            <div className="text-right">
              <span className="text-[8px] text-slate-500 uppercase font-bold block">Period & Pay Date</span>
              <span className="font-medium text-slate-800 block text-[9px]">
                {formatDate(payslip.periodStart)} – {formatDate(payslip.periodEnd)}
              </span>
              <span className="font-bold text-orange-700 block text-[9px]">
                Credited: {formatDate(payslip.creditingDate)}
              </span>
            </div>
          </div>

          {/* Ledger: Earnings vs Deductions */}
          <div className="grid grid-cols-2 gap-1.5 my-1">
            {/* Left: Earnings */}
            <div className="border border-slate-200 rounded p-1 space-y-0.5 bg-white">
              <div className="font-bold text-[8.5px] uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-0.5 flex justify-between">
                <span>Earnings</span>
                <span className="font-mono text-[7.5px] text-slate-400">PHP</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-slate-700">Basic Pay</span>
                <span className="font-mono font-semibold tabular-nums">{formatPHP(payslip.basicPay)}</span>
              </div>
              {payslip.overtimePay > 0 && (
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-700">Overtime (125%)</span>
                  <span className="font-mono tabular-nums">{formatPHP(payslip.overtimePay)}</span>
                </div>
              )}
              {payslip.deMinimisTotal > 0 && (
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-700">De Minimis</span>
                  <span className="font-mono tabular-nums">{formatPHP(payslip.deMinimisTotal)}</span>
                </div>
              )}
              {payslip.taxableAllowancesTotal > 0 && (
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-700">Allowances</span>
                  <span className="font-mono tabular-nums">{formatPHP(payslip.taxableAllowancesTotal)}</span>
                </div>
              )}
              {payslip.bonus > 0 && (
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-700">Incentive</span>
                  <span className="font-mono tabular-nums">{formatPHP(payslip.bonus)}</span>
                </div>
              )}
              {payslip.tardinessDeduction > 0 && (
                <div className="flex justify-between text-[9px] text-rose-700">
                  <span>Tardiness</span>
                  <span className="font-mono tabular-nums">-{formatPHP(payslip.tardinessDeduction)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-0.5 flex justify-between font-bold text-[9px] text-slate-900">
                <span>Gross</span>
                <span className="font-mono tabular-nums">{formatPHP(payslip.grossEarnings)}</span>
              </div>
            </div>

            {/* Right: Deductions */}
            <div className="border border-slate-200 rounded p-1 space-y-0.5 bg-white">
              <div className="font-bold text-[8.5px] uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-0.5 flex justify-between">
                <span>Deductions</span>
                <span className="font-mono text-[7.5px] text-slate-400">EE SHARE</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-slate-700">SSS EE</span>
                <span className="font-mono tabular-nums">{formatPHP(stat.sssEmployee)}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-slate-700">PhilHealth</span>
                <span className="font-mono tabular-nums">{formatPHP(stat.philhealthEmployee)}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-slate-700">Pag-IBIG</span>
                <span className="font-mono tabular-nums">{formatPHP(stat.pagibigEmployee)}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-slate-700">BIR Tax</span>
                <span className="font-mono tabular-nums">{formatPHP(stat.withholdingTax)}</span>
              </div>
              {payslip.customDeductions.map((d) => (
                <div key={d.id} className="flex justify-between text-[9px]">
                  <span className="text-slate-700 truncate max-w-[70px]">{d.name}</span>
                  <span className="font-mono tabular-nums">{formatPHP(d.amount)}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-0.5 flex justify-between font-bold text-[9px] text-rose-800">
                <span>Total Ded.</span>
                <span className="font-mono tabular-nums">-{formatPHP(payslip.totalDeductions)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Net Take-Home Pay & Signatures */}
        <div className="space-y-1 pt-1">
          {/* Joy Orange Net Pay Callout */}
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded px-2 py-1 flex justify-between items-center shadow-xs">
            <div>
              <span className="text-[7.5px] font-bold uppercase tracking-widest text-orange-100 block">
                NET TAKE-HOME PAY
              </span>
              <span className="text-[8px] text-orange-100 truncate block">
                {payslip.bankDetails.bankName} ({payslip.bankDetails.accountNumber})
              </span>
            </div>
            <span className="font-mono font-black text-sm sm:text-base tracking-tight tabular-nums text-white">
              {formatPHP(payslip.netPay)}
            </span>
          </div>

          {/* Signoff Row */}
          <div className="grid grid-cols-2 gap-2 text-[8px] pt-1 text-slate-600 border-t border-slate-200">
            <div>
              <span className="block font-mono text-[7.5px]">TIN: {payslip.governmentIds.tin}</span>
              <span className="block font-mono text-[7.5px]">SSS: {payslip.governmentIds.sss}</span>
            </div>
            <div className="text-right">
              <div className="border-b border-slate-400 h-3"></div>
              <span className="text-[7.5px] text-slate-500 uppercase block mt-0.5">
                Received by: {payslip.employeeName.split(' ')[0]} {payslip.employeeName.split(' ').slice(-1)[0]}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // LAYOUT 2: FULL US LETTER PAGE (1 VOUCHER PER LETTER SHEET)
  // Formatted for 8.5 x 11 inches with Joy Orange styling
  // -------------------------------------------------------------
  return (
    <div
      id={elementId}
      className="payslip-print-sheet bg-white text-slate-900 mx-auto border border-slate-300 print:border-none print:shadow-none print:m-0 print:p-0 font-sans p-6 sm:p-8 max-w-4xl text-xs rounded-xl shadow-md select-none"
      style={{ minHeight: '260mm' }}
    >
      {/* Formal Corporate Header */}
      <div className="border-b-2 border-slate-900 pb-3.5 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center p-1.5 flex-shrink-0">
              <BrandLogo className="w-full h-full text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950 uppercase leading-none">
                {company.name}
              </h1>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
            {company.addressLine1}
            {company.addressLine2 ? `, ${company.addressLine2}` : ''}, {company.city}, {company.province} {company.postalCode}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 text-[10px] font-mono text-slate-600 mt-1">
            <span>TIN: <strong className="text-slate-900">{company.tin}</strong></span>
            <span>•</span>
            <span>RDO: <strong className="text-slate-900">{company.rdoCode}</strong></span>
            <span>•</span>
            <span>SSS ER: <strong className="text-slate-900">{company.sssEmployerNumber}</strong></span>
            <span>•</span>
            <span>PhilHealth ER: <strong className="text-slate-900">{company.philhealthEmployerNumber}</strong></span>
            <span>•</span>
            <span>HDMF ER: <strong className="text-slate-900">{company.pagibigEmployerNumber}</strong></span>
          </div>
        </div>

        {/* Payslip Header Card */}
        <div className="text-left sm:text-right bg-orange-50/80 border border-orange-200 p-3 sm:min-w-[210px] w-full sm:w-auto rounded-lg">
          <div className="text-xs font-black tracking-wider uppercase text-orange-900 border-b border-orange-200 pb-1 mb-1">
            OFFICIAL PAYSLIP (US LETTER)
          </div>
          <div className="text-[11px] text-slate-600">Ref No:</div>
          <div className="font-mono font-bold text-slate-900 text-xs tracking-wider">
            {payslip.payslipNumber}
          </div>
          <div className="text-[11px] text-slate-600 mt-1">
            Crediting Date: <strong className="text-orange-700">{formatDate(payslip.creditingDate)}</strong>
          </div>
        </div>
      </div>

      {/* Employee Identification Grid */}
      <div className="my-4 border border-slate-300 bg-slate-50/70 p-3.5 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
        <div>
          <span className="text-slate-500 uppercase tracking-wider text-[9px] font-bold block">
            Employee Name
          </span>
          <span className="font-bold text-slate-950 text-xs block truncate">
            {payslip.employeeName}
          </span>
          <span className="font-mono text-[10px] text-orange-700">{payslip.employeeNumber}</span>
        </div>

        <div>
          <span className="text-slate-500 uppercase tracking-wider text-[9px] font-bold block">
            Position & Dept
          </span>
          <span className="font-semibold text-slate-900 block truncate">{payslip.jobTitle}</span>
          <span className="text-slate-600 text-[10px] block">{payslip.department}</span>
        </div>

        <div>
          <span className="text-slate-500 uppercase tracking-wider text-[9px] font-bold block">
            Cut-Off Period
          </span>
          <span className="font-semibold text-slate-900 block truncate">
            {formatDate(payslip.periodStart)} – {formatDate(payslip.periodEnd)}
          </span>
          <span className="text-[10px] text-slate-600 block capitalize">{payslip.periodName}</span>
        </div>

        <div>
          <span className="text-slate-500 uppercase tracking-wider text-[9px] font-bold block">
            Bank Crediting
          </span>
          <span className="font-semibold text-slate-900 block truncate">{payslip.bankDetails.bankName}</span>
          <span className="font-mono text-[10px] text-slate-600">{payslip.bankDetails.accountNumber}</span>
        </div>

        {/* Statutory Numbers Strip */}
        <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px] text-slate-700">
          <div>
            <span className="text-slate-500 font-sans text-[9px] uppercase font-bold block">BIR TIN</span>
            <span>{payslip.governmentIds.tin}</span>
          </div>
          <div>
            <span className="text-slate-500 font-sans text-[9px] uppercase font-bold block">SSS Number</span>
            <span>{payslip.governmentIds.sss}</span>
          </div>
          <div>
            <span className="text-slate-500 font-sans text-[9px] uppercase font-bold block">PhilHealth PIN</span>
            <span>{payslip.governmentIds.philhealth}</span>
          </div>
          <div>
            <span className="text-slate-500 font-sans text-[9px] uppercase font-bold block">Pag-IBIG MID</span>
            <span>{payslip.governmentIds.pagibig}</span>
          </div>
        </div>
      </div>

      {/* Main Financial Ledger: Earnings vs Deductions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
        {/* Earnings Table */}
        <div className="border border-slate-300 rounded-lg overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-orange-50 px-3.5 py-2 border-b border-orange-200 flex justify-between items-center text-[11px] font-bold text-orange-950 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                EARNINGS
              </span>
              <span className="font-mono text-[10px] text-slate-600 font-normal">AMOUNT (PHP)</span>
            </div>

            <div className="p-3 divide-y divide-slate-100 space-y-1 text-[11px]">
              <div className="flex justify-between items-center py-1">
                <div>
                  <span className="font-semibold text-slate-900">Basic Pay</span>
                  <span className="text-[10px] text-slate-500 ml-1.5">({payslip.daysWorked} days)</span>
                </div>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatPHP(payslip.basicPay)}
                </span>
              </div>

              {payslip.overtimePay > 0 && (
                <div className="flex justify-between items-center py-1">
                  <div>
                    <span className="text-slate-800">Regular Overtime (125%)</span>
                    <span className="text-[10px] text-slate-500 ml-1.5">({payslip.overtimeHours} hrs)</span>
                  </div>
                  <span className="font-mono text-slate-900 tabular-nums">
                    {formatPHP(payslip.overtimePay)}
                  </span>
                </div>
              )}

              {/* De Minimis Benefits */}
              {payslip.allowances.filter((a) => !a.isTaxable).map((al) => (
                <div key={al.id} className="flex justify-between items-center py-1">
                  <div>
                    <span className="text-slate-800">{al.name}</span>
                    <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded ml-1 font-medium">De Minimis</span>
                  </div>
                  <span className="font-mono text-slate-800 tabular-nums">
                    {formatPHP(al.amount)}
                  </span>
                </div>
              ))}

              {/* Taxable Allowances */}
              {payslip.allowances.filter((a) => a.isTaxable).map((al) => (
                <div key={al.id} className="flex justify-between items-center py-1">
                  <div>
                    <span className="text-slate-800">{al.name}</span>
                    <span className="text-[9px] text-slate-500 ml-1">(Taxable)</span>
                  </div>
                  <span className="font-mono text-slate-800 tabular-nums">
                    {formatPHP(al.amount)}
                  </span>
                </div>
              ))}

              {payslip.bonus > 0 && (
                <div className="flex justify-between items-center py-1">
                  <span className="font-medium text-slate-800">Incentive / Bonus</span>
                  <span className="font-mono text-slate-900 tabular-nums">
                    {formatPHP(payslip.bonus)}
                  </span>
                </div>
              )}

              {payslip.tardinessDeduction > 0 && (
                <div className="flex justify-between items-center py-1 text-rose-700">
                  <span>Less: Tardiness / Undertime ({payslip.tardinessMinutes} mins)</span>
                  <span className="font-mono tabular-nums">
                    -{formatPHP(payslip.tardinessDeduction)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-orange-50/70 border-t border-orange-200 px-3.5 py-2 flex justify-between items-center font-bold text-xs text-slate-900">
            <span className="uppercase tracking-wider">TOTAL GROSS EARNINGS</span>
            <span className="font-mono text-sm tabular-nums text-slate-950">
              {formatPHP(payslip.grossEarnings)}
            </span>
          </div>
        </div>

        {/* Deductions Table */}
        <div className="border border-slate-300 rounded-lg overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-orange-50 px-3.5 py-2 border-b border-orange-200 flex justify-between items-center text-[11px] font-bold text-orange-950 uppercase tracking-wider">
              <span>MANDATORY & STATUTORY DEDUCTIONS</span>
              <span className="font-mono text-[10px] text-slate-600 font-normal">EE SHARE (PHP)</span>
            </div>

            <div className="p-3 divide-y divide-slate-100 space-y-1 text-[11px]">
              <div className="flex justify-between items-center py-1">
                <div>
                  <span className="text-slate-900 font-medium">SSS Contribution</span>
                  <span className="text-[9px] text-slate-500 ml-1.5 font-mono">(EE)</span>
                </div>
                <span className="font-mono text-slate-900 tabular-nums">
                  {formatPHP(stat.sssEmployee)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <div>
                  <span className="text-slate-900 font-medium">PhilHealth Contribution</span>
                  <span className="text-[9px] text-slate-500 ml-1.5 font-mono">(EE 2.5%)</span>
                </div>
                <span className="font-mono text-slate-900 tabular-nums">
                  {formatPHP(stat.philhealthEmployee)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <div>
                  <span className="text-slate-900 font-medium">Pag-IBIG / HDMF Contribution</span>
                  <span className="text-[9px] text-slate-500 ml-1.5 font-mono">(EE)</span>
                </div>
                <span className="font-mono text-slate-900 tabular-nums">
                  {formatPHP(stat.pagibigEmployee)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <div>
                  <span className="text-slate-900 font-medium">BIR Withholding Tax</span>
                  <span className="text-[9px] text-slate-500 ml-1.5 font-mono">(TRAIN Law)</span>
                </div>
                <span className="font-mono text-slate-900 tabular-nums">
                  {formatPHP(stat.withholdingTax)}
                </span>
              </div>

              {payslip.customDeductions.map((d) => (
                <div key={d.id} className="flex justify-between items-center py-1">
                  <span className="text-slate-800">{d.name}</span>
                  <span className="font-mono text-slate-900 tabular-nums">
                    {formatPHP(d.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-orange-50/70 border-t border-orange-200 px-3.5 py-2 flex justify-between items-center font-bold text-xs text-slate-900">
            <span className="uppercase tracking-wider">TOTAL DEDUCTIONS</span>
            <span className="font-mono text-sm tabular-nums text-rose-800">
              -{formatPHP(payslip.totalDeductions)}
            </span>
          </div>
        </div>
      </div>

      {/* Joy Orange Net Pay Callout Banner */}
      <div className="border-2 border-orange-500 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white p-4 rounded-xl shadow-md flex flex-col sm:flex-row justify-between items-center gap-2 my-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-orange-100 block">
            NET TAKE-HOME PAY (PHILIPPINE PESOS)
          </span>
          <p className="text-[11px] text-orange-100 mt-0.5">
            Credited directly to {payslip.bankDetails.bankName} Account {payslip.bankDetails.accountNumber}
          </p>
        </div>

        <div className="text-right">
          <span className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-white tabular-nums">
            {formatPHP(payslip.netPay)}
          </span>
        </div>
      </div>

      {/* Employer Remittances (DOLE Transparency) */}
      <div className="border border-slate-300 bg-slate-50/50 p-2.5 rounded-lg text-[10px] text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="col-span-2 sm:col-span-4 font-bold text-slate-800 uppercase tracking-wider text-[9px] border-b border-slate-200 pb-1">
          EMPLOYER STATUTORY REMITTANCES (Non-deductible from employee salary)
        </div>
        <div>
          <span className="text-slate-500 block">SSS Employer Share:</span>
          <strong className="font-mono text-slate-900">{formatPHP(stat.sssEmployer)}</strong>
        </div>
        <div>
          <span className="text-slate-500 block">PhilHealth ER Share:</span>
          <strong className="font-mono text-slate-900">{formatPHP(stat.philhealthEmployer)}</strong>
        </div>
        <div>
          <span className="text-slate-500 block">Pag-IBIG ER Share:</span>
          <strong className="font-mono text-slate-900">{formatPHP(stat.pagibigEmployer)}</strong>
        </div>
        <div>
          <span className="text-slate-500 block">Total Remittance:</span>
          <strong className="font-mono text-slate-900">
            {formatPHP(stat.sssEmployer + stat.philhealthEmployer + stat.pagibigEmployer)}
          </strong>
        </div>
      </div>

      {/* Compliance Acknowledgement & Signatures */}
      <div className="mt-5 pt-3 border-t border-slate-300 space-y-4">
        <p className="text-[10px] text-slate-600 leading-relaxed italic">
          &ldquo;I hereby acknowledge receipt of the sum stated above, representing full and complete settlement of all salaries, allowances, and compensation due to me for the indicated payroll period.&rdquo;
        </p>

        <div className="grid grid-cols-3 gap-6 pt-4 items-end text-[11px]">
          {/* QR Verification */}
          <div className="flex items-center gap-2">
            <div className="w-16 h-16 border border-slate-300 bg-white p-1 rounded flex-shrink-0 shadow-xs">
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Token" className="w-full h-full object-contain" />
              )}
            </div>
            <div className="text-[9px] text-slate-500 leading-tight">
              <strong className="text-orange-900 block text-[10px]">DOLE ART. 103</strong>
              <span>Ref: {payslip.payslipNumber.slice(-8)}</span>
              <span className="block text-emerald-600 font-bold mt-0.5">✓ Certified Disbursed</span>
            </div>
          </div>

          {/* Prepared By / Corporate Signatory */}
          <div className="text-center">
            <div className="border-b border-slate-400 pb-1 font-serif italic text-xs text-slate-800">
              {company.authorizedSignatoryName}
            </div>
            <span className="font-bold text-[10px] text-slate-900 block mt-0.5">
              {company.authorizedSignatoryName}
            </span>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">
              {company.authorizedSignatoryTitle}
            </span>
          </div>

          {/* Employee Signature Acknowledgement */}
          <div className="text-center">
            <div className="border-b border-slate-400 pb-1 h-6"></div>
            <span className="font-bold text-[10px] text-slate-900 block mt-0.5">
              {payslip.employeeName}
            </span>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">
              Employee Signature & Date
            </span>
          </div>
        </div>

        <div className="text-[9px] text-slate-400 text-center border-t border-slate-200 pt-2">
          {company.payslipFooterText?.replace(/\s*For inquiries, contact[^\.]+\.?/i, '').trim() ||
            'Confidential document issued pursuant to DOLE Labor Code Article 103 and BIR Withholding Regulations.'}
        </div>
      </div>
    </div>
  );
};
