import React, { useState } from 'react';
import { Employee, EmploymentType, AllowanceItem, CustomDeductionItem, CompanyProfile } from '../../types/payroll';
import { triggerHapticFeedback } from '../../utils/printService';
import { formatPHP } from '../../utils/currency';
import { X, Plus, Trash2, UserCheck } from 'lucide-react';

interface EmployeeFormModalProps {
  employee?: Employee | null;
  company: CompanyProfile;
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
  const [hireDate, setHireDate] = useState(employee?.hireDate || new Date().toISOString().slice(0, 10));
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    employee?.employmentType || 'regular'
  );
  
  // Philippine Compensation
  const [monthlyRate, setMonthlyRate] = useState<number>(employee?.monthlyRate || 50000);
  const dailyRate = Number((monthlyRate / 261 * 12 / 12).toFixed(2)) || Number((monthlyRate / 21.75).toFixed(2));
  const hourlyRate = Number((dailyRate / 8).toFixed(2));

  // Philippine Government IDs
  const [tin, setTin] = useState(employee?.governmentIds?.tin || '');
  const [sss, setSss] = useState(employee?.governmentIds?.sss || '');
  const [philhealth, setPhilhealth] = useState(employee?.governmentIds?.philhealth || '');
  const [pagibig, setPagibig] = useState(employee?.governmentIds?.pagibig || '');

  // Banking
  const [bankName, setBankName] = useState(employee?.bankDetails?.bankName || 'BDO Unibank, Inc.');
  const [accountNumber, setAccountNumber] = useState(employee?.bankDetails?.accountNumber || '');

  // Allowances (De Minimis & Taxable)
  const [allowances, setAllowances] = useState<AllowanceItem[]>(
    employee?.allowances || [
      { id: 'al-rice', name: 'Rice Subsidy (Non-Taxable De Minimis)', amount: 2000, isTaxable: false },
    ]
  );

  // Custom Deductions (e.g. SSS Loan)
  const [customDeductions, setCustomDeductions] = useState<CustomDeductionItem[]>(
    employee?.customDeductions || []
  );

  const [activeTab, setActiveTab] = useState<'profile' | 'salary' | 'gov_bank'>('profile');

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
    if (!firstName || !lastName || !monthlyRate) {
      alert('Please fill in employee name and monthly salary rate.');
      return;
    }

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
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-2.5 px-4 border-b-2 transition ${
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
            className={`py-2.5 px-4 border-b-2 transition ${
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
            className={`py-2.5 px-4 border-b-2 transition ${
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
                    min="10000"
                    step="500"
                    value={monthlyRate}
                    onChange={(e) => setMonthlyRate(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Daily Rate (261 factor)
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
                      value={item.amount}
                      onChange={(e) => {
                        const copy = [...allowances];
                        copy[idx].amount = parseFloat(e.target.value) || 0;
                        setAllowances(copy);
                      }}
                      className="w-24 p-2 bg-slate-50 border border-slate-300 rounded font-mono text-slate-900"
                      placeholder="PHP"
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
                      value={item.amount}
                      onChange={(e) => {
                        const copy = [...customDeductions];
                        copy[idx].amount = parseFloat(e.target.value) || 0;
                        setCustomDeductions(copy);
                      }}
                      className="w-28 p-2 bg-slate-50 border border-slate-300 rounded font-mono text-slate-900"
                      placeholder="PHP"
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
