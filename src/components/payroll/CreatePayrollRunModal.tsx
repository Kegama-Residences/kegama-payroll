import React, { useState } from 'react';
import { Employee, PayrollRun, CompanyProfile, PaymentFrequency } from '../../types/payroll';
import { calculatePhilippinePayslip } from '../../utils/calculations';
import { formatPHP } from '../../utils/currency';
import { triggerHapticFeedback } from '../../utils/printService';
import { Calendar, Users, X, ArrowRight } from 'lucide-react';

interface CreatePayrollRunModalProps {
  employees: Employee[];
  company: CompanyProfile;
  onClose: () => void;
  onCreateRun: (run: PayrollRun) => void;
}

export const CreatePayrollRunModal: React.FC<CreatePayrollRunModalProps> = ({
  employees,
  onClose,
  onCreateRun,
}) => {
  const activeEmployees = employees.filter((e) => e.status === 'active');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleDateString('en-PH', { month: 'long' });

  // Default to 1st Cut-Off (1-15) or 2nd Cut-off (16-EOM)
  const isSecondHalf = now.getDate() > 15;
  const defaultStart = new Date(year, month, isSecondHalf ? 16 : 1)
    .toISOString()
    .slice(0, 10);
  const defaultEnd = isSecondHalf
    ? new Date(year, month + 1, 0).toISOString().slice(0, 10)
    : new Date(year, month, 15).toISOString().slice(0, 10);
  const defaultCrediting = defaultEnd;

  const [periodName, setPeriodName] = useState<string>(
    `${monthName} ${isSecondHalf ? '16–' + new Date(year, month + 1, 0).getDate() : '1–15'}, ${year} (${isSecondHalf ? '2nd' : '1st'} Cut-Off)`
  );
  const [periodStart, setPeriodStart] = useState<string>(defaultStart);
  const [periodEnd, setPeriodEnd] = useState<string>(defaultEnd);
  const [creditingDate, setCreditingDate] = useState<string>(defaultCrediting);
  const [frequency, setFrequency] = useState<PaymentFrequency>('semi-monthly');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(
    activeEmployees.map((e) => e.id)
  );

  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedEmployeeIds.length === activeEmployees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(activeEmployees.map((e) => e.id));
    }
  };

  const selectedEmployees = activeEmployees.filter((e) =>
    selectedEmployeeIds.includes(e.id)
  );

  const projectedPayslips = selectedEmployees.map((emp) =>
    calculatePhilippinePayslip(emp, {
      periodStart,
      periodEnd,
      creditingDate,
      periodName,
      frequency,
    })
  );

  const projectedGross = projectedPayslips.reduce((s, p) => s + p.grossEarnings, 0);
  const projectedDeductions = projectedPayslips.reduce(
    (s, p) => s + p.totalDeductions,
    0
  );
  const projectedNet = projectedPayslips.reduce((s, p) => s + p.netPay, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee for the payroll run.');
      return;
    }

    triggerHapticFeedback();

    const newRun: PayrollRun = {
      id: `run-${Date.now()}`,
      periodName,
      periodStart,
      periodEnd,
      creditingDate,
      frequency,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalEmployees: projectedPayslips.length,
      totalGrossPay: Number(projectedGross.toFixed(2)),
      totalDeductions: Number(projectedDeductions.toFixed(2)),
      totalNetPay: Number(projectedNet.toFixed(2)),
      totalWithholdingTax: Number(
        projectedPayslips.reduce((s, p) => s + p.statutory.withholdingTax, 0).toFixed(2)
      ),
      totalSssEmployee: Number(
        projectedPayslips.reduce((s, p) => s + p.statutory.sssEmployee, 0).toFixed(2)
      ),
      totalSssEmployer: Number(
        projectedPayslips.reduce((s, p) => s + p.statutory.sssEmployer, 0).toFixed(2)
      ),
      totalPhilhealthEmployee: Number(
        projectedPayslips.reduce((s, p) => s + p.statutory.philhealthEmployee, 0).toFixed(2)
      ),
      totalPhilhealthEmployer: Number(
        projectedPayslips.reduce((s, p) => s + p.statutory.philhealthEmployer, 0).toFixed(2)
      ),
      totalPagibigEmployee: Number(
        projectedPayslips.reduce((s, p) => s + p.statutory.pagibigEmployee, 0).toFixed(2)
      ),
      totalPagibigEmployer: Number(
        projectedPayslips.reduce((s, p) => s + p.statutory.pagibigEmployer, 0).toFixed(2)
      ),
      payslips: projectedPayslips,
      notes: `Philippine ${frequency} payroll for ${periodName}`,
    };

    onCreateRun(newRun);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto">
        <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-orange-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                Create Payroll Cut-Off Cycle
              </h3>
              <p className="text-[11px] text-slate-400">
                Philippine Labor Code compliant semi-monthly or monthly cut-off
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cycle Description / Label
              </label>
              <input
                type="text"
                required
                value={periodName}
                onChange={(e) => setPeriodName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cycle Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as PaymentFrequency)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900"
              >
                <option value="semi-monthly">Semi-Monthly (Quincena: 15th & 30th)</option>
                <option value="monthly">Monthly (Full Month)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cut-Off Start Date
              </label>
              <input
                type="date"
                required
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cut-Off End Date
              </label>
              <input
                type="date"
                required
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Direct Deposit Crediting Date
              </label>
              <input
                type="date"
                required
                value={creditingDate}
                onChange={(e) => setCreditingDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                <Users className="w-4 h-4 text-slate-500" />
                Select Active Employees ({selectedEmployeeIds.length} of {activeEmployees.length})
              </span>
              <button
                type="button"
                onClick={toggleAll}
                className="text-orange-600 font-bold hover:underline"
              >
                {selectedEmployeeIds.length === activeEmployees.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto border border-slate-300 rounded-lg p-2 divide-y divide-slate-100 bg-slate-50/50">
              {activeEmployees.map((emp) => {
                const isSelected = selectedEmployeeIds.includes(emp.id);
                return (
                  <label
                    key={emp.id}
                    className="flex items-center justify-between py-2 px-2 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEmployee(emp.id)}
                        className="rounded text-orange-600 focus:ring-orange-500"
                      />
                      <div>
                        <span className="font-semibold text-slate-900">
                          {emp.firstName} {emp.lastName}
                        </span>
                        <span className="text-slate-500 text-[10px] block">
                          {emp.jobTitle} • {emp.department}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-slate-900 font-semibold tabular-nums">
                      {formatPHP(emp.monthlyRate)}/mo
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 flex justify-between items-center">
            <div>
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block">
                Total Projected Net Disbursal (PHP)
              </span>
              <span className="text-[11px] text-slate-500">
                Gross: {formatPHP(projectedGross)} | Deductions: -{formatPHP(projectedDeductions)}
              </span>
            </div>
            <span className="font-mono text-base font-black text-slate-950 tabular-nums">
              {formatPHP(projectedNet)}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedEmployeeIds.length === 0}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-lg shadow-md shadow-orange-600/20 flex items-center gap-2 transition active:scale-95"
            >
              <span>Generate Run & Payslips</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
