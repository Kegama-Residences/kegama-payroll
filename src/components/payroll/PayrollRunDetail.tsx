import React, { useState } from 'react';
import { PayrollRun, CompanyProfile, PayslipItem, PayrollStatus } from '../../types/payroll';
import { formatPHP, formatDate } from '../../utils/currency';
import { triggerHapticFeedback, printElement } from '../../utils/printService';
import { PayslipDocument } from '../payslip/PayslipDocument';
import {
  ArrowLeft,
  Printer,
  Edit3,
  Search,
  Users,
  CheckCircle2
} from 'lucide-react';

interface PayrollRunDetailProps {
  run: PayrollRun;
  company: CompanyProfile;
  onBack: () => void;
  onUpdateRunStatus: (runId: string, status: PayrollStatus) => void;
  onUpdatePayslip: (runId: string, updatedPayslip: PayslipItem) => void;
  onOpenPayslipModal: (payslip: PayslipItem) => void;
  onBulkPrint: (run: PayrollRun) => void;
}

export const PayrollRunDetail: React.FC<PayrollRunDetailProps> = ({
  run,
  company,
  onBack,
  onUpdateRunStatus,
  onUpdatePayslip,
  onOpenPayslipModal,
  onBulkPrint,
}) => {
  const [selectedPayslipId, setSelectedPayslipId] = useState<string>(
    run.payslips[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingPayslip, setEditingPayslip] = useState<PayslipItem | null>(null);

  const filteredPayslips = run.payslips.filter(
    (p) =>
      p.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedPayslip =
    run.payslips.find((p) => p.id === selectedPayslipId) || run.payslips[0];

  const handlePrintSelected = () => {
    if (selectedPayslip) {
      printElement(`tablet-payslip-doc-${selectedPayslip.id}`);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayslip) return;

    // Recalculate gross and net
    const gross = Number(
      (
        editingPayslip.basicPay +
        editingPayslip.overtimePay +
        editingPayslip.deMinimisTotal +
        editingPayslip.taxableAllowancesTotal +
        editingPayslip.bonus -
        editingPayslip.tardinessDeduction
      ).toFixed(2)
    );

    const net = Number((gross - editingPayslip.totalDeductions).toFixed(2));

    const updated: PayslipItem = {
      ...editingPayslip,
      grossEarnings: gross,
      netPay: net,
    };

    onUpdatePayslip(run.id, updated);
    setEditingPayslip(null);
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              triggerHapticFeedback();
              onBack();
            }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition"
            title="Back to Cycles"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                {run.periodName}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider bg-slate-100 text-slate-700">
                {run.frequency}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Cut-off: {formatDate(run.periodStart)} – {formatDate(run.periodEnd)} • Crediting: {formatDate(run.creditingDate)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
            {(['draft', 'approved', 'disbursed'] as PayrollStatus[]).map((st) => (
              <button
                key={st}
                onClick={() => {
                  triggerHapticFeedback();
                  onUpdateRunStatus(run.id, st);
                }}
                className={`px-2.5 py-1 rounded capitalize text-[11px] transition ${
                  run.status === st
                    ? st === 'disbursed'
                      ? 'bg-emerald-700 text-white shadow-sm font-bold'
                      : st === 'approved'
                      ? 'bg-orange-600 text-white shadow-sm font-bold'
                      : 'bg-amber-600 text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              triggerHapticFeedback();
              onBulkPrint(run);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-md shadow-orange-600/20 transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print All ({run.payslips.length})</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Employees on Run
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {run.totalEmployees}
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Gross Compensation
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {formatPHP(run.totalGrossPay)}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Statutory & BIR Deductions
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-base sm:text-lg font-bold font-mono text-rose-800 dark:text-rose-400 tabular-nums">
              -{formatPHP(run.totalDeductions)}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Net Take-Home Disbursed
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-base sm:text-lg font-black font-mono text-white tabular-nums">
              {formatPHP(run.totalNetPay)}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Master-Detail Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Employee List (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {filteredPayslips.map((p) => {
              const isSelected = p.id === selectedPayslip?.id;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    triggerHapticFeedback();
                    setSelectedPayslipId(p.id);
                  }}
                  className={`p-3 rounded-lg border transition cursor-pointer flex justify-between items-center ${
                    isSelected
                      ? 'bg-orange-50/70 dark:bg-slate-800 border-orange-500 dark:border-orange-500 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {p.employeeName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {p.employeeNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {p.jobTitle} • {p.bankDetails.bankName}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0 flex items-center gap-2">
                    <div>
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white block tabular-nums">
                        {formatPHP(p.netPay)}
                      </span>
                      <span className="text-[10px] text-slate-400">Net Pay</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPayslip(p);
                        }}
                        className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-800"
                        title="Adjust Overtime/Incentive"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Phone trigger for preview modal */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHapticFeedback();
                          onOpenPayslipModal(p);
                        }}
                        className="lg:hidden p-1.5 bg-slate-900 text-white rounded shadow-sm"
                        title="View Full Payslip"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Tablet & Desktop Live Inspector (lg:col-span-7) */}
        <div className="hidden lg:flex lg:col-span-7 flex-col bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 overflow-hidden">
          {selectedPayslip ? (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Official Payslip Preview
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {selectedPayslip.payslipNumber}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingPayslip(selectedPayslip)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 text-slate-800 rounded text-xs font-semibold hover:bg-slate-50"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Adjust OT / Incentive</span>
                  </button>

                  <button
                    onClick={handlePrintSelected}
                    className="flex items-center gap-1.5 px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-bold shadow-sm transition active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>

                  <button
                    onClick={() => {
                      triggerHapticFeedback();
                      onOpenPayslipModal(selectedPayslip);
                    }}
                    className="px-2.5 py-1 bg-slate-200 text-slate-800 rounded text-xs font-semibold hover:bg-slate-300"
                  >
                    Full Screen
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[72vh] p-2 flex justify-center">
                <div className="w-full">
                  <PayslipDocument
                    payslip={selectedPayslip}
                    company={company}
                    elementId={`tablet-payslip-doc-${selectedPayslip.id}`}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400 text-xs">
              Select an employee to inspect payslip.
            </div>
          )}
        </div>
      </div>

      {/* Adjust Overtime / Bonus Modal */}
      {editingPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Adjust Line Items: {editingPayslip.employeeName}
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Overtime Hours (Regular Day 125%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editingPayslip.overtimeHours || 0}
                  onChange={(e) => {
                    const hours = parseFloat(e.target.value) || 0;
                    const otRate = (editingPayslip.basicPay / (11 * 8)) * 1.25;
                    const otAmount = Number((hours * otRate).toFixed(2));
                    setEditingPayslip({
                      ...editingPayslip,
                      overtimeHours: hours,
                      overtimePay: otAmount,
                    });
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Special Incentive / Performance Bonus (PHP ₱)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={editingPayslip.bonus || 0}
                  onChange={(e) =>
                    setEditingPayslip({
                      ...editingPayslip,
                      bonus: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tardiness / Undertime (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editingPayslip.tardinessMinutes || 0}
                  onChange={(e) => {
                    const mins = parseInt(e.target.value) || 0;
                    const minRate = (editingPayslip.basicPay / (11 * 8 * 60));
                    const lateDed = Number((mins * minRate).toFixed(2));
                    setEditingPayslip({
                      ...editingPayslip,
                      tardinessMinutes: mins,
                      tardinessDeduction: lateDed,
                    });
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingPayslip(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold shadow-md shadow-orange-600/20"
                >
                  Apply & Recalculate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
