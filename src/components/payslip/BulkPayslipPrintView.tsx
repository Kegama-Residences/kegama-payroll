import React, { useState } from 'react';
import { CompanyProfile, PayrollRun } from '../../types/payroll';
import { PayslipDocument } from './PayslipDocument';
import { printElement, triggerHapticFeedback } from '../../utils/printService';
import { Printer, X, Scissors, FileText } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface BulkPayslipPrintViewProps {
  payrollRun: PayrollRun;
  company: CompanyProfile;
  onClose: () => void;
}

export const BulkPayslipPrintView: React.FC<BulkPayslipPrintViewProps> = ({
  payrollRun,
  company,
  onClose,
}) => {
  // '4up' fits 4 payslips per 8.5x11" Letter page; 'full' is 1 per page
  const [printMode, setPrintMode] = useState<'4up' | 'full'>('4up');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  const handleBulkPrint = async () => {
    triggerHapticFeedback();
    setIsPrinting(true);
    setPrintError(null);
    try {
      const res = await printElement('bulk-payslip-print-container', `Kegama Bulk Payslips - ${payrollRun.periodName}`);
      if (!res.ok) setPrintError(res.error || 'Print failed. Try again.');
    } catch (e) {
      setPrintError(e instanceof Error ? e.message : 'Print failed. Try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  // Helper to chunk payslips into groups of 4 for Letter 4-up printing
  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const res: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      res.push(arr.slice(i, i + size));
    }
    return res;
  };

  const chunkedPayslips = chunkArray(payrollRun.payslips, 4);
  const totalSheetsNeeded = printMode === '4up' ? chunkedPayslips.length : payrollRun.payslips.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      {/* Top Header & Layout Controls (Joy Orange Styled) */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-safe">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold flex-shrink-0 p-1.5 shadow-xs">
            <BrandLogo className="w-full h-full text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold">
                Batch Print ({payrollRun.payslips.length} Employees)
              </h2>
              <span className="px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-mono font-bold uppercase">
                US Letter (8.5&times;11&Prime;)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {payrollRun.periodName} • Estimated {totalSheetsNeeded} Letter sheet{totalSheetsNeeded > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Layout Switcher & Print Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* 4-in-1 vs 1-per-page Toggle */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => {
                triggerHapticFeedback();
                setPrintMode('4up');
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-semibold text-xs transition ${
                printMode === '4up'
                  ? 'bg-orange-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Fit 4 quarter-sheet vouchers per Letter sheet"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>4-in-1 Sheet (Quarter)</span>
            </button>
            <button
              onClick={() => {
                triggerHapticFeedback();
                setPrintMode('full');
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-semibold text-xs transition ${
                printMode === 'full'
                  ? 'bg-orange-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="1 full payslip per Letter sheet"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>1 per Page</span>
            </button>
          </div>

          <button
            onClick={handleBulkPrint}
            disabled={isPrinting || payrollRun.payslips.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-md shadow-orange-600/20 transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>{isPrinting ? 'Preparing print…' : `Print All (${totalSheetsNeeded} Sheet${totalSheetsNeeded > 1 ? 's' : ''})`}</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {printError && (
        <div className="mx-4 mt-2 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-[11px] text-rose-200" role="alert">
          {printError}
        </div>
      )}
      {payrollRun.payslips.length === 0 && (
        <div className="mx-4 mt-4 p-6 text-center text-slate-400 text-xs border border-dashed border-slate-700 rounded-xl">
          No payslips in this run yet.
        </div>
      )}

      {/* Scrollable multi-document view */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/40 flex justify-center">
        <div id="bulk-payslip-print-container" className="w-full max-w-5xl space-y-8">
          {/* MODE 1: 4-in-1 Letter Sheet (Quarter Sheet 2x2 Grid) */}
          {printMode === '4up' &&
            chunkedPayslips.map((chunk, pageIdx) => (
              <div
                key={`page-${pageIdx}`}
                className="letter-4up-page bg-white p-3 sm:p-4 rounded-xl border border-slate-300 print:border-none print:shadow-none shadow-sm print:m-0 print:p-0"
                style={{ minHeight: '268mm' }}
              >
                {chunk.map((payslip) => (
                  <div key={payslip.id} className="h-full">
                    <PayslipDocument
                      payslip={payslip}
                      company={company}
                      elementId={`bulk-quarter-${payslip.id}`}
                      layout="quarter"
                    />
                  </div>
                ))}
                {/* If chunk has less than 4, fill remaining quadrants with blank vouchers */}
                {chunk.length < 4 &&
                  Array.from({ length: 4 - chunk.length }).map((_, emptyIdx) => (
                    <div
                      key={`empty-${emptyIdx}`}
                      className="border border-dashed border-slate-200 rounded p-4 flex flex-col items-center justify-center text-slate-300 text-[10px] font-mono"
                    >
                      <span>[ BLANK VOUCHER QUADRANT ]</span>
                    </div>
                  ))}
              </div>
            ))}

          {/* MODE 2: 1 Full Payslip per Letter Page */}
          {printMode === 'full' &&
            payrollRun.payslips.map((payslip) => (
              <div key={payslip.id} className="page-break">
                <PayslipDocument
                  payslip={payslip}
                  company={company}
                  elementId={`bulk-doc-${payslip.id}`}
                  layout="full"
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
