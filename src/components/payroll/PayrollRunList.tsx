import React from 'react';
import { PayrollRun } from '../../types/payroll';
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
  Trash2,
  WalletCards,
  ArrowUpRight,
  FileCheck2
} from 'lucide-react';

interface PayrollRunListProps {
  runs: PayrollRun[];
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
  const totalNet = runs.reduce((sum, run) => sum + run.totalNetPay, 0);
  const totalGross = runs.reduce((sum, run) => sum + run.totalGrossPay, 0);
  const approvedRuns = runs.filter((run) => run.status !== 'draft').length;

  return (
    <div className="p-4 sm:p-7 max-w-7xl mx-auto space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-slate-950 p-5 sm:p-7 text-white shadow-xl shadow-slate-900/10">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-300">Payroll control center</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Keep every pay run moving.</h2>
            <p className="mt-2 max-w-xl text-xs leading-5 text-slate-400 sm:text-sm">
              Create compliant cut-offs, review take-home pay, and keep your team ready for payday.
            </p>
          </div>
          <button
            onClick={() => {
              triggerHapticFeedback();
              onNewRun();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-xs font-extrabold text-white shadow-lg shadow-orange-950/40 transition hover:bg-orange-400 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Start new cut-off</span>
          </button>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
          <div>
            <span className="section-kicker text-slate-500">Total payroll runs</span>
            <p className="mt-1 text-xl font-bold">{runs.length}</p>
          </div>
          <div>
            <span className="section-kicker text-slate-500">Net payroll tracked</span>
            <p className="mt-1 text-lg font-bold font-mono tabular-nums">{formatPHP(totalNet)}</p>
          </div>
          <div className="hidden sm:block">
            <span className="section-kicker text-slate-500">Reviewed / approved</span>
            <p className="mt-1 text-xl font-bold">{approvedRuns}<span className="text-sm text-slate-500"> / {runs.length}</span></p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <WalletCards className="h-4 w-4 text-orange-500" />
          <p className="mt-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Gross compensation</p>
          <p className="mt-1 font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">{formatPHP(totalGross)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          <p className="mt-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Latest take-home</p>
          <p className="mt-1 font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">{formatPHP(runs[0]?.totalNetPay || 0)}</p>
        </div>
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:col-span-1">
          <FileCheck2 className="h-4 w-4 text-sky-500" />
          <p className="mt-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Latest status</p>
          <p className="mt-1 text-sm font-bold capitalize text-slate-900 dark:text-white">{runs[0]?.status || 'No runs yet'}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-kicker">Your payroll history</p>
          <h3 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">Recent cut-offs</h3>
        </div>
        <span className="hidden text-xs font-medium text-slate-400 sm:block">{runs.length} recorded {runs.length === 1 ? 'run' : 'runs'}</span>
      </div>

      {/* Runs List */}
      <div className="space-y-3">

        {runs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-dashed border-orange-300 dark:border-slate-800 shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/40">
              <Calendar className="h-7 w-7" />
            </div>
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
                  className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md dark:hover:border-orange-900 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
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
                       <h4 className="text-sm sm:text-base font-extrabold text-slate-950 dark:text-white">
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
