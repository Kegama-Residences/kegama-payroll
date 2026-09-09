import React, { useState } from 'react';
import { Employee, PayrollRun, CompanyProfile, PaymentFrequency } from '../../types/payroll';
import { calculatePhilippinePayslip, summarizePayslips } from '../../utils/calculations';
import { AttendanceMap, summarizePeriod } from '../../utils/attendance';
import { formatPHP, formatLocalDate } from '../../utils/currency';
import { triggerHapticFeedback } from '../../utils/printService';
import { newId } from '../../utils/id';
import { Calendar, Users, X, ArrowRight, AlertCircle, CalendarCheck, AlertTriangle } from 'lucide-react';

interface CreatePayrollRunModalProps {
  employees: Employee[];
  company: CompanyProfile;
  /** Existing runs used to detect overlapping periods (#20). */
  runs?: PayrollRun[];
  attendance: AttendanceMap;
  onClose: () => void;
  onCreateRun: (run: PayrollRun) => void;
}

export const CreatePayrollRunModal: React.FC<CreatePayrollRunModalProps> = ({
  employees,
  runs = [],
  attendance,
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
  const defaultStart = formatLocalDate(new Date(year, month, isSecondHalf ? 16 : 1));
  const defaultEnd = isSecondHalf
    ? formatLocalDate(new Date(year, month + 1, 0))
    : formatLocalDate(new Date(year, month, 15));
  const defaultCrediting = defaultEnd;

  const [periodName, setPeriodName] = useState<string>(
    `${monthName} ${isSecondHalf ? '16-' + new Date(year, month + 1, 0).getDate() : '1-15'}, ${year} (${isSecondHalf ? '2nd' : '1st'} Cut-Off)`
  );
  const [periodStart, setPeriodStart] = useState<string>(defaultStart);
  const [periodEnd, setPeriodEnd] = useState<string>(defaultEnd);
  const [creditingDate, setCreditingDate] = useState<string>(defaultCrediting);
  const [frequency, setFrequency] = useState<PaymentFrequency>('semi-monthly');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(
    activeEmployees.map((e) => e.id)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [pullAttendance, setPullAttendance] = useState(true);

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

  // Attendance pull: days, absences (as undertime), OT, holidays flow in
  // automatically. Untouched periods behave exactly like manual entry.
  const attendanceSummaries = selectedEmployees.map((emp) =>
    pullAttendance ? summarizePeriod(emp, attendance, periodStart, periodEnd) : null,
  );
  const attendanceStats = attendanceSummaries.reduce(
    (acc, s) => {
      if (!s || !s.hasMarks) return acc;
      acc.marked += 1;
      acc.absent += s.absentDays + s.halfDays * 0.5;
      acc.ot += s.overtimeHours;
      acc.rdOt += s.restDayOvertimeHours;
      return acc;
    },
    { marked: 0, absent: 0, ot: 0, rdOt: 0 },
  );

  const projectedPayslips = selectedEmployees.map((emp, i) => {
    const s = attendanceSummaries[i];
    return calculatePhilippinePayslip(emp, {
      periodStart,
      periodEnd,
      creditingDate,
      periodName,
      frequency,
      ...(s
        ? {
            overtimeHours: s.overtimeHours,
            restDayOvertimeHours: s.restDayOvertimeHours,
            nightDiffHours: s.nightDiffHours,
            holidayPay: s.holidayPay,
            tardinessMinutes: s.tardinessMinutes,
            undertimeMinutes: s.undertimeMinutes,
            daysWorked: s.daysWorked,
            attendanceSourced: s.hasMarks,
          }
        : {}),
    });
  });

  const totals = summarizePayslips(projectedPayslips);
  const projectedGross = totals.totalGrossPay;
  const projectedDeductions = totals.totalDeductions;
  const projectedNet = totals.totalNetPay;

  /** Detect whether [periodStart, periodEnd] overlaps any existing run (#20). */
  const overlappingRuns = runs.filter((r) => {
    if (!periodStart || !periodEnd) return false;
    return periodStart <= r.periodEnd && periodEnd >= r.periodStart;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (selectedEmployees.length === 0) {
      setFormError('Please select at least one employee for the payroll run.');
      return;
    }
    if (periodStart > periodEnd) {
      setFormError('The cut-off end date must be on or after the start date.');
      return;
    }
    if (creditingDate < periodEnd) {
      setFormError('The crediting date must be on or after the cut-off end date.');
      return;
    }
    if (!periodName.trim()) {
      setFormError('Please provide a cycle description.');
      return;
    }

    triggerHapticFeedback();

    const newRun: PayrollRun = {
      id: newId('run'),
      periodName: periodName.trim(),
      periodStart,
      periodEnd,
      creditingDate,
      frequency,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalEmployees: projectedPayslips.length,
      ...totals,
      payslips: projectedPayslips,
      notes: `Philippine ${frequency} payroll for ${periodName.trim()}`,
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
          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2" role="alert">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Overlapping period warning (#20) */}
          {overlappingRuns.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2" role="alert">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Overlapping period:</strong>{' '}
                {overlappingRuns.map((r) => r.periodName).join(', ')} already covers part of this date range. You can still proceed, but verify this is intentional.
              </span>
            </div>
          )}

          {activeEmployees.length === 0 && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center">
              <p className="font-bold text-slate-700 dark:text-slate-200">No active employees yet</p>
              <p className="text-[11px] text-slate-500 mt-1">Add your first employee under Employees to generate a payroll run.</p>
            </div>
          )}
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
                onChange={(e) => {
                  const newFreq = e.target.value as PaymentFrequency;
                  setFrequency(newFreq);
                  if (newFreq === 'monthly') {
                    const lastDayNum = new Date(year, month + 1, 0).getDate();
                    const start = formatLocalDate(new Date(year, month, 1));
                    const end = formatLocalDate(new Date(year, month + 1, 0));
                    setPeriodStart(start);
                    setPeriodEnd(end);
                    setCreditingDate(end);
                    setPeriodName(`${monthName} 1-${lastDayNum}, ${year} (Monthly)`);
                  } else {
                    setPeriodStart(defaultStart);
                    setPeriodEnd(defaultEnd);
                    setCreditingDate(defaultEnd);
                    setPeriodName(
                      `${monthName} ${isSecondHalf ? '16-' + new Date(year, month + 1, 0).getDate() : '1-15'}, ${year} (${isSecondHalf ? '2nd' : '1st'} Cut-Off)`
                    );
                  }
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900"
              >
                <option value="semi-monthly">Semi-Monthly (Quincena: 15th &amp; 30th)</option>
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

          <label className="flex items-start gap-2.5 p-3 border border-slate-300 rounded-lg bg-slate-50/50 cursor-pointer">
            <input
              type="checkbox"
              checked={pullAttendance}
              onChange={(e) => setPullAttendance(e.target.checked)}
              className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
            />
            <span>
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-orange-600" />
                Pull days &amp; hours from the work calendar
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {pullAttendance
                  ? attendanceStats.marked > 0
                    ? `Calendar applied for ${attendanceStats.marked} employee(s): ${attendanceStats.absent} day(s) absent, ${attendanceStats.ot} regular OT hr(s)${attendanceStats.rdOt > 0 ? `, ${attendanceStats.rdOt} rest-day OT hr(s)` : ''}.`
                    : 'No calendar marks in this period — scheduled defaults used.'
                  : 'Off — every payslip uses scheduled days and zero hours.'}
              </span>
            </span>
          </label>

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
              <span>Generate Run &amp; Payslips</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
