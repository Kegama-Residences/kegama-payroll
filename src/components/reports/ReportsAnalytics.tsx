import React from 'react';
import { PayrollRun, CompanyProfile, Employee } from '../../types/payroll';
import { formatPHP } from '../../utils/currency';
import { triggerHapticFeedback } from '../../utils/printService';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  BarChart3,
  Building,
  FileSpreadsheet
} from 'lucide-react';

interface ReportsAnalyticsProps {
  runs: PayrollRun[];
  employees: Employee[];
  company: CompanyProfile;
}

export const ReportsAnalytics: React.FC<ReportsAnalyticsProps> = ({
  runs,
  employees,
}) => {
  const totalGross = runs.reduce((s, r) => s + r.totalGrossPay, 0);
  const totalNet = runs.reduce((s, r) => s + r.totalNetPay, 0);
  const totalWithholdingTax = runs.reduce((s, r) => s + r.totalWithholdingTax, 0);
  const totalSss = runs.reduce((s, r) => s + (r.totalSssEmployee + r.totalSssEmployer), 0);
  const totalPhilHealth = runs.reduce((s, r) => s + (r.totalPhilhealthEmployee + r.totalPhilhealthEmployer), 0);
  const totalPagIbig = runs.reduce((s, r) => s + (r.totalPagibigEmployee + r.totalPagibigEmployer), 0);

  // Departmental breakdown based on active employee base
  const deptMap: Record<string, { count: number; totalSalary: number }> = {};
  employees.forEach((emp) => {
    if (!deptMap[emp.department]) {
      deptMap[emp.department] = { count: 0, totalSalary: 0 };
    }
    deptMap[emp.department].count += 1;
    deptMap[emp.department].totalSalary += emp.monthlyRate;
  });

  const deptList = Object.entries(deptMap).map(([dept, data]) => ({
    department: dept,
    count: data.count,
    totalSalary: data.totalSalary,
    avgSalary: data.count > 0 ? data.totalSalary / data.count : 0,
  }));

  const exportCSV = async () => {
    triggerHapticFeedback();
    const csvCell = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;
    const headers = [
      'Cut-Off Period',
      'Payslip Ref',
      'Employee Number',
      'Employee Name',
      'BIR TIN',
      'SSS No',
      'PhilHealth PIN',
      'Pag-IBIG MID',
      'Department',
      'Basic Pay (PHP)',
      'Gross Pay (PHP)',
      'BIR Withholding Tax (PHP)',
      'SSS EE (PHP)',
      'PhilHealth EE (PHP)',
      'Pag-IBIG EE (PHP)',
      'Total Deductions (PHP)',
      'Net Take-Home (PHP)',
      'Bank Name',
      'Account Number',
    ];

    const rows: string[][] = [];
    runs.forEach((run) => {
      run.payslips.forEach((p) => {
        rows.push([
          csvCell(run.periodName),
          csvCell(p.payslipNumber),
          csvCell(p.employeeNumber),
          csvCell(p.employeeName),
          csvCell(p.governmentIds.tin),
          csvCell(p.governmentIds.sss),
          csvCell(p.governmentIds.philhealth),
          csvCell(p.governmentIds.pagibig),
          csvCell(p.department),
          csvCell(p.basicPay.toFixed(2)),
          csvCell(p.grossEarnings.toFixed(2)),
          csvCell(p.statutory.withholdingTax.toFixed(2)),
          csvCell(p.statutory.sssEmployee.toFixed(2)),
          csvCell(p.statutory.philhealthEmployee.toFixed(2)),
          csvCell(p.statutory.pagibigEmployee.toFixed(2)),
          csvCell(p.totalDeductions.toFixed(2)),
          csvCell(p.netPay.toFixed(2)),
          csvCell(p.bankDetails.bankName),
          csvCell(p.bankDetails.accountNumber),
        ]);
      });
    });

    const csvText = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const today = new Date();
    const dateStamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const fileName = `Kegama_PH_Payroll_Summary_${dateStamp}.csv`;

    if (Capacitor.isNativePlatform()) {
      try {
        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: csvText,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: 'Kegama Payroll CSV Export',
          text: `Kegama PH Payroll Summary (${fileName})`,
          url: writeResult.uri,
          dialogTitle: 'Export or Share Payroll CSV',
        });
        return;
      } catch (err) {
        console.warn('Native CSV export failed, falling back to browser download:', err);
      }
    }

    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  };

  return (
      <div className="p-4 sm:p-7 max-w-7xl mx-auto space-y-5">
      {/* Streamlined Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <p className="section-kicker">Compliance & reporting</p>
          <h2 className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-600" />
            Statutory & Tax Remittances
          </h2>
          <p className="text-xs text-slate-500">
            BIR Form 1601-C, SSS (R-5), PhilHealth (EPRS), and Pag-IBIG monthly totals
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 flex-shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export BIR/DOLE CSV</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Cumulative Gross Compensation
          </span>
          <span className="font-mono text-lg sm:text-xl font-black text-slate-900 dark:text-white block mt-1 tabular-nums">
            {formatPHP(totalGross)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Net Take-Home Disbursed
          </span>
          <span className="font-mono text-lg sm:text-xl font-black text-slate-900 dark:text-white block mt-1 tabular-nums">
            {formatPHP(totalNet)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            BIR Withholding Tax (Form 1601-C)
          </span>
          <span className="font-mono text-lg sm:text-xl font-black text-amber-800 dark:text-amber-400 block mt-1 tabular-nums">
            {formatPHP(totalWithholdingTax)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            SSS Remittance (EE + ER Total)
          </span>
          <span className="font-mono text-lg sm:text-xl font-black text-slate-900 dark:text-white block mt-1 tabular-nums">
            {formatPHP(totalSss)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            PhilHealth Premium (5% Total)
          </span>
          <span className="font-mono text-lg sm:text-xl font-black text-slate-900 dark:text-white block mt-1 tabular-nums">
            {formatPHP(totalPhilHealth)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Pag-IBIG / HDMF Contribution Total
          </span>
          <span className="font-mono text-lg sm:text-xl font-black text-slate-900 dark:text-white block mt-1 tabular-nums">
            {formatPHP(totalPagIbig)}
          </span>
        </div>
      </div>

      {/* Department Breakdown */}
       <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Building className="w-4 h-4 text-orange-600" />
          Departmental Monthly Compensation (PHP ₱)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[10px] uppercase bg-slate-100 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4 text-center">Headcount</th>
                <th className="py-2.5 px-4 text-right">Monthly Base Payroll</th>
                <th className="py-2.5 px-4 text-right">Average Monthly Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deptList.map((item) => (
                <tr key={item.department} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {item.department}
                  </td>
                  <td className="py-3 px-4 text-center font-medium text-slate-600">
                    {item.count}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {formatPHP(item.totalSalary)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums">
                    {formatPHP(item.avgSalary)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
