import React, { useState } from 'react';
import { Employee, EmploymentType, AllowanceItem, CustomDeductionItem } from '../../types/payroll';
import { triggerHapticFeedback } from '../../utils/printService';
import { computePagIbig, computePhilHealth, computeSSS, computeWithholdingTax, deriveRates, factorForSchedule, otRateFor } from '../../utils/calculations';
import { formatPHP, formatLocalDate } from '../../utils/currency';
import { numOrEmpty, parseNumInput } from '../../utils/numberInput';
import { X, Plus, Trash2, UserCheck } from 'lucide-react';

interface EmployeeFormModalProps {
  employee?: Employee | null;
  onClose: () => void;
  onSave: (employee: Employee) => void;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  employee,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(employee);

  const [firstName, setFirstName] = useState(employee?.firstName || '');
  const [lastName, setLastName] = useState(employee?.lastName || '');
  const [email, setEmail] = useState(employee?.email || '');
  const [phone, setPhone] = useState(employee?.phone || '+63 9');
  const [employeeNumber, setEmployeeNumber] = useState(
    employee?.employeeNumber || `KGM-PH-0${Math.floor(100 + Math.random() * 900)}`
  );
  const [jobTitle, setJobTitle] = useState(employee?.jobTitle || '');
  const [department, setDepartment] = useState(employee?.department || 'Front Office');
  const [hireDate, setHireDate] = useState(employee?.hireDate || formatLocalDate(new Date()));
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    employee?.employmentType || 'regular'
  );
  
  // Statutory benefits enrollment — off for workers with no benefits yet
  const [statutoryExempt, setStatutoryExempt] = useState(employee?.statutoryExempt === true);

  // Weekly work schedule (rest day varies per employee; 7-day = Sundays included, no rest day)
  const [restDay, setRestDay] = useState(employee?.workSchedule?.restDay ?? 0);
  const [daysPerWeek, setDaysPerWeek] = useState<5 | 6 | 7>(employee?.workSchedule?.daysPerWeek ?? 6);
  const [hoursPerDay, setHoursPerDay] = useState<number>(employee?.workSchedule?.hoursPerDay ?? 8);
  const rateFactor = factorForSchedule({ restDay, daysPerWeek });

  // Philippine Compensation
  const [monthlyRate, setMonthlyRate] = useState<number>(employee?.monthlyRate || 50000);
  const { dailyRate, hourlyRate } = deriveRates(monthlyRate, { restDay, daysPerWeek, hoursPerDay });
  // Fixed OT peso rate actually paid by the company. 0/empty = auto (hourly × 125%).
  const [otHourlyRate, setOtHourlyRate] = useState<number>(employee?.otHourlyRate ?? 0);
  const effectiveOtRate = otHourlyRate > 0 ? otHourlyRate : otRateFor({ hourlyRate });

  // Live preview of auto-computed statutory deductions (monthly, updates with salary)
  const salaryForPreview = Number.isFinite(monthlyRate) && monthlyRate > 0 ? monthlyRate : 0;
  const previewSSS = statutoryExempt ? { ee: 0, er: 0 } : computeSSS(salaryForPreview, 'monthly');
  const previewPhilHealth = statutoryExempt ? { ee: 0, er: 0 } : computePhilHealth(salaryForPreview, 'monthly');
  const previewPagIbig = statutoryExempt ? { ee: 0, er: 0 } : computePagIbig(salaryForPreview, 'monthly');
  const previewEETotal = previewSSS.ee + previewPhilHealth.ee + previewPagIbig.ee;
  const previewBirEstimate = computeWithholdingTax(
    Math.max(0, salaryForPreview - previewEETotal),
    'monthly'
  );

  // Philippine Government IDs
  const [tin, setTin] = useState(employee?.governmentIds?.tin || '');
  const [sss, setSss] = useState(employee?.governmentIds?.sss || '');
  const [philhealth, setPhilhealth] = useState(employee?.governmentIds?.philhealth || '');
  const [pagibig, setPagibig] = useState(employee?.governmentIds?.pagibig || '');

  // Banking
  const [bankName, setBankName] = useState(employee?.bankDetails?.bankName || 'BDO Unibank, Inc.');
  const [accountNumber, setAccountNumber] = useState(employee?.bankDetails?.accountNumber || '');

  // Allowances (De Minimis & Taxable) — start empty so employees
  // without benefits don't get phantom rows on their payslip.
  const [allowances, setAllowances] = useState<AllowanceItem[]>(
    employee?.allowances || []
  );

  // Custom Deductions (e.g. SSS Loan)
  const [customDeductions, setCustomDeductions] = useState<CustomDeductionItem[]>(
    employee?.customDeductions || []
  );

  const [activeTab, setActiveTab] = useState<'profile' | 'salary' | 'gov_bank'>('profile');
  const [formError, setFormError] = useState<string | null>(null);

  const addAllowance = () => {
    setAllowances([
      ...allowances,
      { id: `al-${Date.now()}`, name: 'New Allowance', amount: 1000, isTaxable: false },
    ]);
  };

  const removeAllowance = (id: string) => {
    setAllowances(allowances.filter((a) => a.id !== id));
  };

  const addCustomDeduction = () => {
    setCustomDeductions([
      ...customDeductions,
      { id: `cd-${Date.now()}`, name: 'SSS / Pag-IBIG Loan Amortization', amount: 500 },
    ]);
  };

  const removeCustomDeduction = (id: string) => {
    setCustomDeductions(customDeductions.filter((d) => d.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!firstName.trim() || !lastName.trim() || !monthlyRate) {
      setFormError('Please fill in employee first name, last name, and monthly salary rate.');
      return;
    }
    // Validate email regardless of which tab is currently active (#19).
    if (!email.trim()) {
      setFormError('Please fill in a company email address (required for payslip records).');
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      setFormError('The email address format is invalid. Please check the Profile & Role tab.');
      return;
    }
    const safeHours = Number.isFinite(hoursPerDay) ? Math.min(24, Math.max(1, Math.round(hoursPerDay * 2) / 2)) : 8;
    setHoursPerDay(safeHours);

    triggerHapticFeedback();

    const updatedEmployee: Employee = {
      id: employee?.id || `emp-${Date.now()}`,
      employeeNumber,
      firstName,
      lastName,
      email,
      phone,
      jobTitle,
      department,
      hireDate,
      employmentType,
      monthlyRate: Number(monthlyRate),
      dailyRate,
      hourlyRate,
      ...(otHourlyRate > 0 ? { otHourlyRate: Number(otHourlyRate) } : {}),
      governmentIds: {
        tin,
        sss,
        philhealth,
        pagibig,
      },
      bankDetails: {
        bankName,
        accountNumber,
        accountType: 'payroll',
      },
      allowances,
      customDeductions,
      status: employee?.status || 'active',
      statutoryExempt: statutoryExempt ? true : undefined,
      workSchedule: { restDay, daysPerWeek, hoursPerDay: safeHours },
    };

    onSave(updatedEmployee);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-orange-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                {isEditing ? `Edit ${firstName} ${lastName}` : 'Add Employee Profile'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Philippine employment record, statutory numbers & bank payroll account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="no-scrollbar flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
              className={`shrink-0 whitespace-nowrap py-2.5 px-4 border-b-2 transition ${
              activeTab === 'profile'
                ? 'border-orange-600 text-orange-600 dark:text-orange-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Profile & Role
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('salary')}
              className={`shrink-0 whitespace-nowrap py-2.5 px-4 border-b-2 transition ${
              activeTab === 'salary'
                ? 'border-orange-600 text-orange-600 dark:text-orange-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Monthly Salary & Benefits (PHP)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gov_bank')}
              className={`shrink-0 whitespace-nowrap py-2.5 px-4 border-b-2 transition ${
              activeTab === 'gov_bank'
                ? 'border-orange-600 text-orange-600 dark:text-orange-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Statutory IDs & Bank Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300" role="alert">
              {formError}
            </div>
          )}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Employee Number
                </label>
                <input
                  type="text"
                  required
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number (PH)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date of Hire
                </label>
                <input
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  list="hotel-departments"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Front Office, Housekeeping, F&B"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
                <datalist id="hotel-departments">
                  <option value="Front Office" />
                  <option value="Housekeeping" />
                  <option value="Food & Beverage" />
                  <option value="Guest Services" />
                  <option value="Facilities & Engineering" />
                  <option value="Administration & Finance" />
                </datalist>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Job Designation
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Front Office Supervisor, Sous Chef, Guest Relations"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Employment Status
                </label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg capitalize text-slate-900"
                >
                  <option value="regular">Regular</option>
                  <option value="probationary">Probationary</option>
                  <option value="contractual">Contractual / Project-Based</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'salary' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Base Salary (PHP ₱)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="100"
                    value={numOrEmpty(monthlyRate)}
                    placeholder="0"
                    onChange={(e) => setMonthlyRate(parseNumInput(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Daily Rate ({rateFactor} factor)
                  </label>
                  <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-lg font-mono text-sm text-slate-800">
                    {formatPHP(dailyRate)}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hourly Rate
                  </label>
                  <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-lg font-mono text-sm text-slate-800">
                    {formatPHP(hourlyRate)}/hr
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  OT Pay per Hour (₱) — what the company really pays
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={numOrEmpty(otHourlyRate)}
                  placeholder={`Auto ${formatPHP(effectiveOtRate)}/hr (125%)`}
                  onChange={(e) => setOtHourlyRate(parseNumInput(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm text-slate-900"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  {otHourlyRate > 0
                    ? `Fixed ${formatPHP(otHourlyRate)}/hr will be used for every OT hour.`
                    : `Empty/0 = auto ${formatPHP(effectiveOtRate)}/hr (hourly × 125%). Set the actual peso rate if different.`}
                </p>
              </div>

              {/* Weekly work schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Work Days per Week
                  </label>
                  <select
                    value={daysPerWeek}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setDaysPerWeek(v === 5 ? 5 : v === 7 ? 7 : 6);
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value={6}>6 days (313 factor)</option>
                    <option value={5}>5 days (261 factor)</option>
                    <option value={7}>7 days, Sundays included (393 factor)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hours per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    step="0.5"
                    value={numOrEmpty(hoursPerDay)}
                    placeholder="8"
                    onChange={(e) => setHoursPerDay(parseNumInput(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Weekly Rest Day {daysPerWeek === 7 && <span className="font-normal">(none — 7-day)</span>}
                  </label>
                  <select
                    value={restDay}
                    onChange={(e) => setRestDay(Number(e.target.value))}
                    disabled={daysPerWeek === 7}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 disabled:opacity-50"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
              </div>

              {/* Benefits enrollment toggle */}
              <label className="flex items-start gap-2.5 p-3 border border-slate-300 rounded-lg bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!statutoryExempt}
                  onChange={(e) => setStatutoryExempt(!e.target.checked)}
                  className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
                />
                <span>
                  <span className="font-bold text-slate-900 block">
                    Enrolled in statutory benefits (SSS / PhilHealth / Pag-IBIG)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Uncheck for time-based or casual workers with no benefits yet — no minimum
                    contributions will be charged. Income tax still applies.
                  </span>
                </span>
              </label>

              {/* Auto-computed mandatory deductions — live preview */}
              <div className="border border-slate-300 rounded-lg p-3 space-y-2 bg-slate-50/50">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">
                    Mandatory Deductions{' '}
                    <span className="font-normal text-slate-500">(auto from salary)</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">MONTHLY EST.</span>
                </div>

                <div className="divide-y divide-slate-200">
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-700">SSS — EE 5% of salary credit (MSC ₱5k–₱35k)</span>
                    <span className="font-mono font-semibold tabular-nums">{formatPHP(previewSSS.ee)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-700">PhilHealth — EE 2.5% (floor ₱10k / ceiling ₱100k)</span>
                    <span className="font-mono font-semibold tabular-nums">{formatPHP(previewPhilHealth.ee)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-700">Pag-IBIG — EE (capped ₱200/mo)</span>
                    <span className="font-mono font-semibold tabular-nums">{formatPHP(previewPagIbig.ee)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-700">
                      Est. BIR withholding{' '}
                      <span className="text-[10px] text-slate-500">(base pay only)</span>
                    </span>
                    <span className="font-mono font-semibold tabular-nums">{formatPHP(previewBirEstimate)}</span>
                  </div>
                </div>

                <div className="border-t border-slate-300 pt-2 flex justify-between items-center font-bold text-slate-900">
                  <span>Est. total employee deductions</span>
                  <span className="font-mono tabular-nums">
                    {formatPHP(previewEETotal + previewBirEstimate)}
                  </span>
                </div>

                {statutoryExempt && (
                  <p className="text-[11px] font-semibold text-amber-700 leading-relaxed">
                    Statutory contributions are OFF for this employee — SSS, PhilHealth, and
                    Pag-IBIG will be ₱0 on every payslip until re-enrolled.
                  </p>
                )}
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Split 50/50 across semi-monthly cut-offs. Final BIR tax is set per pay run —
                  overtime, allowances, and bonuses change it.
                </p>
              </div>

              {/* Allowances */}
              <div className="border border-slate-300 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">
                    Recurring Allowances & De Minimis Benefits
                  </span>
                  <button
                    type="button"
                    onClick={addAllowance}
                    className="flex items-center gap-1 text-orange-600 font-bold hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {allowances.length === 0 && (
                  <p className="text-[11px] text-slate-500 py-2 text-center">
                    No allowances — tap Add only if this employee gets benefits.
                  </p>
                )}

                {allowances.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const copy = [...allowances];
                        copy[idx].name = e.target.value;
                        setAllowances(copy);
                      }}
                      className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded text-slate-900"
                      placeholder="e.g. Rice Subsidy"
                    />
                    <input
                      type="number"
                      value={numOrEmpty(item.amount)}
                      onChange={(e) => {
                        const copy = [...allowances];
                        copy[idx].amount = parseNumInput(e.target.value);
                        setAllowances(copy);
                      }}
                      className="w-24 p-2 bg-slate-50 border border-slate-300 rounded font-mono text-slate-900"
                      placeholder="0"
                    />
                    <label className="flex items-center gap-1 text-[11px] text-slate-600 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={item.isTaxable}
                        onChange={(e) => {
                          const copy = [...allowances];
                          copy[idx].isTaxable = e.target.checked;
                          setAllowances(copy);
                        }}
                      />
                      Taxable
                    </label>
                    <button
                      type="button"
                      onClick={() => removeAllowance(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Custom Deductions */}
              <div className="border border-slate-300 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">
                    Other Deductions (e.g. SSS / Pag-IBIG Salary Loan)
                  </span>
                  <button
                    type="button"
                    onClick={addCustomDeduction}
                    className="flex items-center gap-1 text-orange-600 font-bold hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {customDeductions.length === 0 && (
                  <p className="text-[11px] text-slate-500 py-2 text-center">
                    No extra deductions — tap Add only for loans or other amortizations.
                  </p>
                )}

                {customDeductions.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const copy = [...customDeductions];
                        copy[idx].name = e.target.value;
                        setCustomDeductions(copy);
                      }}
                      className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded text-slate-900"
                      placeholder="Deduction title"
                    />
                    <input
                      type="number"
                      value={numOrEmpty(item.amount)}
                      onChange={(e) => {
                        const copy = [...customDeductions];
                        copy[idx].amount = parseNumInput(e.target.value);
                        setCustomDeductions(copy);
                      }}
                      className="w-28 p-2 bg-slate-50 border border-slate-300 rounded font-mono text-slate-900"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomDeduction(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'gov_bank' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  BIR Tax Identification Number (TIN)
                </label>
                <input
                  type="text"
                  value={tin}
                  onChange={(e) => setTin(e.target.value)}
                  placeholder="e.g. 284-910-332-000"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  SSS Number
                </label>
                <input
                  type="text"
                  value={sss}
                  onChange={(e) => setSss(e.target.value)}
                  placeholder="e.g. 34-8910245-1"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  PhilHealth Identification Number (PIN)
                </label>
                <input
                  type="text"
                  value={philhealth}
                  onChange={(e) => setPhilhealth(e.target.value)}
                  placeholder="e.g. 12-009841235-9"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pag-IBIG / HDMF MID Number
                </label>
                <input
                  type="text"
                  value={pagibig}
                  onChange={(e) => setPagibig(e.target.value)}
                  placeholder="e.g. 1210-9948-2301"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bank / E-Wallet Provider
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="BDO Unibank, Inc.">BDO Unibank, Inc.</option>
                  <option value="Bank of the Philippine Islands (BPI)">Bank of the Philippine Islands (BPI)</option>
                  <option value="UnionBank of the Philippines">UnionBank of the Philippines</option>
                  <option value="Metropolitan Bank & Trust Co. (Metrobank)">Metropolitan Bank & Trust Co. (Metrobank)</option>
                  <option value="Security Bank Corporation">Security Bank Corporation</option>
                  <option value="Rizal Commercial Banking Corporation (RCBC)">Rizal Commercial Banking Corporation (RCBC)</option>
                  <option value="GCash (G-Xchange, Inc.)">GCash (G-Xchange, Inc.)</option>
                  <option value="Maya Philippines, Inc.">Maya Philippines, Inc.</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payroll Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. •••• 4892"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold shadow-md shadow-orange-600/20 transition active:scale-95"
            >
              {isEditing ? 'Save Employee Changes' : 'Register Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
