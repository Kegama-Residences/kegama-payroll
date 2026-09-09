import React, { useState } from 'react';
import { CompanyProfile, PayslipItem } from '../../types/payroll';
import { PayslipDocument } from './PayslipDocument';
import { printElement, triggerHapticFeedback } from '../../utils/printService';
import { downloadOrSharePDF } from '../../utils/pdfGenerator';
import { formatPHP } from '../../utils/currency';
import {
  Printer,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Check,
  Loader2
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface PayslipPreviewModalProps {
  payslip: PayslipItem;
  company: CompanyProfile;
  allPayslips?: PayslipItem[];
  onClose: () => void;
  onSelectPayslip?: (payslip: PayslipItem) => void;
}

export const PayslipPreviewModal: React.FC<PayslipPreviewModalProps> = ({
  payslip,
  company,
  allPayslips = [],
  onClose,
  onSelectPayslip,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [layout, setLayout] = useState<'full' | 'quarter'>('full');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentIndex = allPayslips.findIndex((p) => p.id === payslip.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < allPayslips.length - 1;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePrint = async () => {
    triggerHapticFeedback();
    const docId = `modal-payslip-doc-${payslip.id}`;
    await printElement(docId, `Payslip - ${payslip.employeeName} - ${payslip.payslipNumber}`);
  };

  const handleDownloadPDF = async () => {
    triggerHapticFeedback();
    setIsExporting(true);
    const docId = `modal-payslip-doc-${payslip.id}`;
    const filename = `Payslip_${payslip.employeeNumber}_${payslip.payslipNumber.slice(-7)}.pdf`;
    const res = await downloadOrSharePDF(docId, filename, `Payslip - ${payslip.employeeName}`);
    setIsExporting(false);
    showToast(res.message);
  };

  const handlePrev = () => {
    if (hasPrev && onSelectPayslip) {
      triggerHapticFeedback();
      onSelectPayslip(allPayslips[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onSelectPayslip) {
      triggerHapticFeedback();
      onSelectPayslip(allPayslips[currentIndex + 1]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      {/* Top Floating Control Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg pt-safe">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold flex-shrink-0 p-1.5 shadow-xs">
            <BrandLogo className="w-full h-full text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold truncate max-w-[160px] sm:max-w-xs text-white">
                {payslip.employeeName}
              </h2>
              <span className="px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-mono font-bold">
                US Letter
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Ref: {payslip.payslipNumber} • Net: {formatPHP(payslip.netPay)}
            </p>
          </div>
        </div>

        {/* Action Buttons: Layout Switcher, Print, PDF */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Layout Toggle: Full Letter vs 4-in-1 Quarter Sheet */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => {
                triggerHapticFeedback();
                setLayout('full');
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                layout === 'full'
                  ? 'bg-orange-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Full US Letter Page (1 voucher per page)"
            >
              Full Letter
            </button>
            <button
              onClick={() => {
                triggerHapticFeedback();
                setLayout('quarter');
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                layout === 'quarter'
                  ? 'bg-orange-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Quarter-Sheet Voucher (Fits 4 per Letter page)"
            >
              Quarter (4-in-1)
            </button>
          </div>

          {/* Zoom controls */}
          <div className="hidden md:flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setScale((s) => Math.max(0.6, s - 0.1))}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-slate-400">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(1.4, s + 0.1))}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Direct Print Button - Joy Orange */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold text-xs shadow-md shadow-orange-600/20 transition active:scale-95"
            title="Print Payslip"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          {/* PDF Download / Share Button */}
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg font-medium text-xs transition active:scale-95 disabled:opacity-50"
            title="Download or Share PDF"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
            ) : (
              <Download className="w-4 h-4 text-emerald-400" />
            )}
            <span className="hidden sm:inline">PDF</span>
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Payslip Scrollable Viewport */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex justify-center items-start">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className={`w-full ${layout === 'quarter' ? 'max-w-md' : 'max-w-4xl'}`}
        >
          <PayslipDocument
            payslip={payslip}
            company={company}
            elementId={`modal-payslip-doc-${payslip.id}`}
            layout={layout}
          />
        </div>
      </div>

      {/* Bottom Employee Navigator Dock for fast browsing */}
      {allPayslips.length > 1 && (
        <div className="bg-slate-900/95 border-t border-slate-800 py-2.5 px-4 flex justify-between items-center text-xs text-slate-300 pb-safe">
          <button
            disabled={!hasPrev}
            onClick={handlePrev}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-[11px] text-slate-400 font-medium font-mono">
            {currentIndex + 1} of {allPayslips.length} Employees
          </span>

          <button
            disabled={!hasNext}
            onClick={handleNext}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full shadow-2xl border border-orange-500/40 flex items-center gap-2 text-xs z-50 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}
    </div>
  );
};
