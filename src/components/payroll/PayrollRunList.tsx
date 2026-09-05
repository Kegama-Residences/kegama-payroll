import React from 'react';
import { PayrollRun, CompanyProfile } from '../../types/payroll';
import { formatPHP, formatDate } from '../../utils/currency';
import { triggerHapticFeedback } from '../../utils/printService';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  Users,
  Plus,
  Trash2
} from 'lucide-react';

interface PayrollRunListProps {
  runs: PayrollRun[];
  company: CompanyProfile;
  onSelectRun: (run: PayrollRun) => void;
  onNewRun: () => void;
  onBulkPrintRun: (run: PayrollRun) => void;
  onDeleteRun: (runId: string) => void;
}

export const PayrollRunList: React.FC<PayrollRunListProps> = ({
  runs,
  onSelectRun,
  onNewRun,
  onBulkPrintRun,
  onDeleteRun,
}) => {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Streamlined Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
            Payroll Cycles ({runs.length})
          </h2>
          <p className="text-xs text-slate-500">
            Semi-monthly & monthly cut-off disbursals and official payslips
          </p>
        </div>

        <button
          onClick={() => {
            triggerHapticFeedback();
            onNewRun();
          }}
          className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition active:scale-95 text-xs flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Cut-Off</span>
        </button>
      </div>

      {/* Runs List */}
      <div className="space-y-3">

        {runs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-10 text-center border border-dashed border-orange-300 dark:border-slate-800">
            <Calendar className="w-10 h-10 text-orange-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Payroll Runs Recorded
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Initiate your first cut-off period to generate compliant payslips.
            </p>
            <button
              onClick={onNewRun}
              className="mt-3 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              Start Cut-Off
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {runs.map((run) => {
              const isDisbursed = run.status === 'disbursed';
              const isApproved = run.status === 'approved';

              return (
                <div
                  key={run.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm hover:border-orange-300 dark:hover:border-orange-900 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  {/* Left: Period & Status */}
                  <div
                    className="flex-1 cursor-pointer w-full"
                    onClick={() => {
                      triggerHapticFeedback();
                      onSelectRun(run);
                    }}
                  >
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-slate-950 dark:text-white">
                        {run.periodName}
                      </h4>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isDisbursed
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : isApproved
                            ? 'bg-orange-100 text-orange-900 border border-orange-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {isDisbursed ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {run.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-2">
                      <span>
                        Cut-Off: <strong>{formatDate(run.periodStart)}</strong> –{' '}
                        <strong>{formatDate(run.periodEnd)}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Crediting: <strong>{formatDate(run.creditingDate)}</strong>
                      </span>
                    </p>
                  </div>

                  {/* Financial Metrics */}
                  <div
                    className="flex items-center gap-4 sm:gap-6 text-xs w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800"
                    onClick={() => {
                      triggerHapticFeedback();
                      onSelectRun(run);
                    }}
                  >
                    <div className="text-left md:text-right">
                      <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">
                        Employees
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {run.totalEmployees}
                      </span>
                    </div>

                    <div className="text-left md:text-right">
                      <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">
                        Gross Pay
                      </span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                        {formatPHP(run.totalGrossPay)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">
                        Net Take-Home
                      </span>
                      <span className="font-mono font-black text-slate-900 dark:text-white text-sm tabular-nums">
                        {formatPHP(run.totalNetPay)}
                      </span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 dark:border-slate-800">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHapticFeedback();
                        onBulkPrintRun(run);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition"
                      title="Print All Payslips"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print All</span>
                    </button>

                    <button
                      onClick={() => {
                        triggerHapticFeedback();
                        onSelectRun(run);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                    >
                      <span>Inspect</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete payroll cycle "${run.periodName}"?`)) {
                          triggerHapticFeedback();
                          onDeleteRun(run.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      title="Delete Cycle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
