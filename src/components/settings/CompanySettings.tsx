import React, { useState } from 'react';
import { CompanyProfile, AppState } from '../../types/payroll';
import { triggerHapticFeedback } from '../../utils/printService';
import {
  Building2,
  Save,
  CheckCircle2,
  PenTool,
  ShieldCheck,
  Terminal,
  Lock,
  Unlock,
  KeyRound,
  ArrowRight,
  Cpu
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { DeveloperPage } from './DeveloperPage';
import { DeveloperPinModal, DEV_SESSION_STORAGE_KEY } from './DeveloperPinModal';

interface CompanySettingsProps {
  company: CompanyProfile;
  appState: AppState;
  onSaveCompany: (updated: CompanyProfile) => void;
  onExportBackup?: () => void;
  onResetData?: () => void;
  onStateReloaded?: (newState: AppState) => void;
}

export const CompanySettings: React.FC<CompanySettingsProps> = ({
  company,
  appState,
  onSaveCompany,
  onExportBackup,
  onResetData,
  onStateReloaded,
}) => {
  const [form, setForm] = useState<CompanyProfile>({ ...company });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Developer Mode & PIN Protection State
  const [activeSubTab, setActiveSubTab] = useState<'company' | 'developer'>('company');
  const [isDevUnlocked, setIsDevUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem(DEV_SESSION_STORAGE_KEY) === 'true';
  });
  const [showPinModal, setShowPinModal] = useState(false);

  const handleOpenDeveloperPortal = () => {
    triggerHapticFeedback();
    if (isDevUnlocked) {
      setActiveSubTab('developer');
    } else {
      setShowPinModal(true);
    }
  };

  const handlePinSuccess = () => {
    setIsDevUnlocked(true);
    setShowPinModal(false);
    setActiveSubTab('developer');
  };

  const handleLockDeveloperMode = () => {
    sessionStorage.removeItem(DEV_SESSION_STORAGE_KEY);
    setIsDevUnlocked(false);
    setActiveSubTab('company');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHapticFeedback();
    onSaveCompany(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div>
      {/* Settings Sub-Navigation Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback();
                setActiveSubTab('company');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition min-h-[40px] ${
                activeSubTab === 'company'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4 text-orange-600" />
              <span>Company Profile</span>
            </button>

            <button
              type="button"
              onClick={handleOpenDeveloperPortal}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition min-h-[40px] ${
                activeSubTab === 'developer'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Terminal className="w-4 h-4 text-orange-400" />
              <span>Developer Console</span>
              {isDevUnlocked ? (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/25">
                  <Unlock className="w-2.5 h-2.5" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border border-slate-300 dark:border-slate-700">
                  <Lock className="w-2.5 h-2.5 text-amber-500 dark:text-amber-400" />
                  Locked
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* RENDER VIEW: DEVELOPER PAGE */}
      {activeSubTab === 'developer' && isDevUnlocked ? (
        <DeveloperPage
          company={company}
          appState={appState}
          onSaveCompany={onSaveCompany}
          onExportBackup={onExportBackup}
          onResetData={onResetData}
          onStateReloaded={onStateReloaded}
          onBackToCompany={() => setActiveSubTab('company')}
          onLockDeveloperMode={handleLockDeveloperMode}
        />
      ) : (
        /* RENDER VIEW: COMPANY SETTINGS */
        <div className="p-3 sm:p-6 pb-24 md:pb-10 max-w-4xl mx-auto space-y-5">
          {/* Quick Access Card to Developer Portal */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-md text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-orange-600/20 text-orange-400 border border-orange-500/30">
                    <Cpu className="w-4 h-4" />
                  </span>
                  <h2 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
                    Developer Portal & Backend Diagnostics
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-orange-400" />
                    PIN Protected
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-xl">
                  Centralized SQLite engine, Mobile release signatures, API security keys, interactive endpoint tester, and performance benchmarks.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenDeveloperPortal}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-orange-600/25 transition active:scale-95 whitespace-nowrap min-h-[44px]"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isDevUnlocked ? 'Open Developer Console' : 'Access Developer Portal'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Corporate Identity Form Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 rounded-2xl shadow-xs">
            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              {/* Legal Entity */}
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-3 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-orange-600" />
                  Corporate Identity & Legal Information
                </h3>

                {/* Active Vector Logo Preview */}
                <div className="flex items-center gap-3.5 p-3 bg-orange-50/60 dark:bg-slate-800/40 border border-orange-200/80 dark:border-slate-700/80 rounded-xl mb-4">
                  <div className="w-12 h-12 rounded-lg bg-orange-600 text-white flex items-center justify-center p-2 shadow-xs flex-shrink-0">
                    <BrandLogo className="w-full h-full text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Active Vector Brand Logo & Seal</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Rendered across high-resolution 4-in-1 print sheets, full Letter vouchers, and navigation headers.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 text-xs">
                      Registered Corporate Name <span className="text-orange-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
                      placeholder="e.g. KEGAMA HOTEL MANAGEMENT CORP."
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 text-xs">
                      Business / Trading Name
                    </label>
                    <input
                      type="text"
                      value={form.tradingName}
                      onChange={(e) => setForm({ ...form, tradingName: e.target.value })}
                      className="w-full p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
                      placeholder="e.g. KEGAMA Resort & Suites"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 text-xs">
                      BIR Tax Identification Number (TIN) <span className="text-orange-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.tin}
                      onChange={(e) => setForm({ ...form, tin: e.target.value })}
                      className="w-full p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
                      placeholder="000-000-000-000"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 text-xs">
                      BIR Revenue District Office (RDO) <span className="text-orange-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.rdoCode}
                      onChange={(e) => setForm({ ...form, rdoCode: e.target.value })}
                      className="w-full p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
                      placeholder="e.g. 057 - San Pedro, Laguna"
                    />
                  </div>
                </div>
              </div>

              {/* Statutory Employer Accounts */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Government Statutory Employer Numbers
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 text-xs">
                      SSS Employer ID
                    </label>
                    <input
                      type="text"
                      value={form.sssEmployerNumber}
                      onChange={(e) => setForm({ ...form, sssEmployerNumber: e.target.value })}
                      className="w-full p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
                      placeholder="03-9999999-9"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 text-xs">
                      PhilHealth Employer Number
                    </label>
                    <input
                      type="text"
                      value={form.philhealthEmployerNumber}
                      onChange={(e) => setForm({ ...form, philhealthEmployerNumber: e.target.value })}
                      className="w-full p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
                      placeholder="12-345678901-2"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 text-xs">
                      Pag-IBIG / HDMF Employer ID
                    </label>
                    <input
                      type="text"
                      value={form.pagibigEmployerNumber}
                      onChange={(e) => setForm({ ...form, pagibigEmployerNumber: e.target.value })}
                      className="w-full p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
                      placeholder="2020-0000-0000"
                    />
                  </div>
                </div>
              </div>

              {/* Office Address */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-3">
                  Principal Business Address
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 text-xs">
                      Building & Street Address
                    </label>
                    <input
                      type="text"
                      value={form.addressLine1}
                      onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                      className="w-full p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 text-xs">
                      City / Municipality
                    </label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 text-xs">
                      Province & Postal Code
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={form.province}
                        placeholder="Province"
                        onChange={(e) => setForm({ ...form, province: e.target.value })}
                        className="p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
                      />
                      <input
                        type="text"
                        value={form.postalCode}
                        placeholder="Postal Code"
                        onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                        className="p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 text-xs">
                      Payroll Inquiries Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 text-xs">
                      Office Phone
                    </label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
                    />
                  </div>
                </div>
              </div>

              {/* Signatory & Payslip Note */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-3 flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-purple-600" />
                  Authorized Corporate Signatory
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 text-xs">
                      Signatory Full Name
                    </label>
                    <input
                      type="text"
                      value={form.authorizedSignatoryName}
                      onChange={(e) =>
                        setForm({ ...form, authorizedSignatoryName: e.target.value })
                      }
                      className="w-full p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 text-xs">
                      Signatory Corporate Title
                    </label>
                    <input
                      type="text"
                      value={form.authorizedSignatoryTitle}
                      onChange={(e) =>
                        setForm({ ...form, authorizedSignatoryTitle: e.target.value })
                      }
                      className="w-full p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 text-xs">
                      Payslip Compliance Disclaimer / Footer
                    </label>
                    <textarea
                      rows={2}
                      value={form.payslipFooterText}
                      onChange={(e) =>
                        setForm({ ...form, payslipFooterText: e.target.value })
                      }
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                {savedSuccess && (
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-4 h-4" /> Configuration updated successfully!
                  </span>
                )}
                <div className="sm:ml-auto">
                  <button
                    type="submit"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-md shadow-orange-600/20 transition active:scale-95 min-h-[44px]"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Company Configuration</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Developer PIN Verification Modal */}
      <DeveloperPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handlePinSuccess}
      />
    </div>
  );
};
