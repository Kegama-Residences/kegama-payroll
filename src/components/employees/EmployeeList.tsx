import React, { useState } from 'react';
import { Employee, PayslipItem } from '../../types/payroll';
import { formatPHP, formatDate } from '../../utils/currency';
import { calculatePhilippinePayslip } from '../../utils/calculations';
import { triggerHapticFeedback } from '../../utils/printService';
import {
  Plus,
  Search,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Edit2,
  FileText,
  Users
} from 'lucide-react';

interface EmployeeListProps {
  employees: Employee[];
  onAddEmployee: () => void;
  onEditEmployee: (employee: Employee) => void;
  onToggleStatus: (employeeId: string) => void;
  onPreviewAdHocPayslip: (payslip: PayslipItem) => void;
}

export const EmployeeList: React.FC<EmployeeListProps> = ({
  employees,
  onAddEmployee,
  onEditEmployee,
  onToggleStatus,
  onPreviewAdHocPayslip,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [search, setSearch] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const departments = Array.from(new Set(employees.map((e) => e.department))).filter(Boolean);

  const filtered = employees.filter((emp) => {
    const matchesSearch =
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeNumber.toLowerCase().includes(search.toLowerCase()) ||
      emp.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      emp.department.toLowerCase().includes(search.toLowerCase());

    const matchesDept = deptFilter === 'all' || emp.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const selectedEmp = employees.find((e) => e.id === selectedEmpId) || employees[0];

  const handleGeneratePreviewPayslip = (emp: Employee) => {
    const now = new Date();
    const isSecondHalf = now.getDate() > 15;
    const year = now.getFullYear();
    const month = now.getMonth();
    const periodStart = new Date(year, month, isSecondHalf ? 16 : 1).toISOString().slice(0, 10);
    const periodEnd = isSecondHalf
      ? new Date(year, month + 1, 0).toISOString().slice(0, 10)
      : new Date(year, month, 15).toISOString().slice(0, 10);

    const mockPayslip = calculatePhilippinePayslip(emp, {
      periodStart,
      periodEnd,
      creditingDate: periodEnd,
      periodName: `${now.toLocaleDateString('en-PH', { month: 'long' })} ${isSecondHalf ? '2nd' : '1st'} Cut-Off`,
      frequency: 'semi-monthly',
    });
    onPreviewAdHocPayslip(mockPayslip);
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Compact Action Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee by name, ID, or position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300"
        >
          <option value="all">All Departments ({employees.length})</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            triggerHapticFeedback();
            onAddEmployee();
          }}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-sm transition active:scale-95 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {employees.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-dashed border-orange-300 dark:border-slate-800">
          <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Employees Registered
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Your employee roster is currently empty. Click below to register hotel staff and configure their basic rates, allowances, and statutory IDs.
          </p>
          <button
            onClick={() => {
              triggerHapticFeedback();
              onAddEmployee();
            }}
            className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Employee</span>
          </button>
        </div>
      ) : (
        /* Master-Detail Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Employees (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-1.5 max-h-[72vh] overflow-y-auto pr-1">
            {filtered.map((emp) => {
              const isSelected = emp.id === selectedEmp?.id;
              const initials = `${emp.firstName[0]}${emp.lastName[0]}`;

            return (
              <div
                key={emp.id}
                onClick={() => {
                  triggerHapticFeedback();
                  setSelectedEmpId(emp.id);
                }}
                className={`p-3 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-orange-50/70 dark:bg-slate-800 border-orange-500 dark:border-orange-500 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {initials}
                  </div>

                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {emp.firstName} {emp.lastName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {emp.employeeNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {emp.jobTitle} • {emp.department}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-white block tabular-nums">
                    {formatPHP(emp.monthlyRate)}
                  </span>
                  <span className="text-[10px] text-slate-400">Monthly Base</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Employee Inspector (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          {selectedEmp ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-900 text-white font-bold text-base flex items-center justify-center">
                    {selectedEmp.firstName[0]}
                    {selectedEmp.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-950 dark:text-white">
                      {selectedEmp.firstName} {selectedEmp.lastName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedEmp.jobTitle} • <strong className="text-slate-700 dark:text-slate-300">{selectedEmp.department}</strong>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 font-semibold">
                        {selectedEmp.employeeNumber}
                      </span>
                      <button
                        onClick={() => {
                          triggerHapticFeedback();
                          onToggleStatus(selectedEmp.id);
                        }}
                        className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${
                          selectedEmp.status === 'active'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-300'
                        }`}
                      >
                        {selectedEmp.status}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      triggerHapticFeedback();
                      onEditEmployee(selectedEmp);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => {
                      triggerHapticFeedback();
                      handleGeneratePreviewPayslip(selectedEmp);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-bold shadow-md shadow-orange-600/20 transition active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Generate Payslip</span>
                  </button>
                </div>
              </div>

              {/* Personal & Banking Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2 border border-slate-200 dark:border-slate-800 p-3 rounded-lg bg-slate-50/50">
                  <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] block">
                    Contact Information
                  </span>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedEmp.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedEmp.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hired: {formatDate(selectedEmp.hireDate)}</span>
                  </div>
                </div>

                <div className="space-y-2 border border-slate-200 dark:border-slate-800 p-3 rounded-lg bg-slate-50/50">
                  <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] block">
                    Bank Crediting Account
                  </span>
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedEmp.bankDetails.bankName}</span>
                  </div>
                  <div className="font-mono text-slate-600 text-[11px]">
                    Acct No: <strong>{selectedEmp.bankDetails.accountNumber}</strong>
                  </div>
                </div>
              </div>

              {/* Philippine Statutory Numbers */}
              <div className="border border-slate-200 dark:border-slate-800 p-3 rounded-lg space-y-1.5">
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] block">
                  Mandatory Government Identifiers
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs text-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-500 font-sans block">BIR TIN</span>
                    <span>{selectedEmp.governmentIds.tin || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-sans block">SSS Number</span>
                    <span>{selectedEmp.governmentIds.sss || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-sans block">PhilHealth PIN</span>
                    <span>{selectedEmp.governmentIds.philhealth || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-sans block">Pag-IBIG MID</span>
                    <span>{selectedEmp.governmentIds.pagibig || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Compensation Summary */}
              <div className="border border-slate-200 dark:border-slate-800 p-3 rounded-lg bg-slate-50/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Base Compensation (PHP ₱)
                  </span>
                  <span className="font-mono font-black text-slate-950 text-sm tabular-nums">
                    {formatPHP(selectedEmp.monthlyRate)} / month
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200">
                  <div>
                    <span className="text-slate-500 text-[11px]">Daily Rate:</span>{' '}
                    <strong className="font-mono text-slate-800">{formatPHP(selectedEmp.dailyRate)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Hourly Rate:</span>{' '}
                    <strong className="font-mono text-slate-800">{formatPHP(selectedEmp.hourlyRate)}/hr</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Select an employee to view details.
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
