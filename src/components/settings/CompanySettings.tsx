import React, { useEffect, useRef, useState } from 'react';
import { CompanyProfile, AppState } from '../../types/payroll';
import { triggerHapticFeedback } from '../../utils/printService';
import { importDataFromJSON } from '../../utils/storage';
import {
  Building2,
  Save,
  CheckCircle2,
  PenTool,
  ShieldCheck,
  Download,
  Upload,
  Trash2,
  AlertCircle,
  HardDrive,
  MapPin,
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface CompanySettingsProps {
  company: CompanyProfile;
  appState: AppState;
  onSaveCompany: (updated: CompanyProfile) => void;
  onExportBackup?: () => void;
  onResetData?: () => void;
  onStateReloaded?: (newState: AppState) => void;
}

const inputCls =
  'w-full min-h-[44px] p-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus-visible:outline-none outline-hidden transition';
const labelCls = 'block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5';
const cardCls =
  'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-4 sm:p-5 scroll-mt-24';
const helperCls = 'mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400';

function Kicker({ icon, kicker, heading, id }: { icon: React.ReactNode; kicker: string; heading: string; id: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5">
        <span className="text-orange-600 dark:text-orange-400">{icon}</span>
        <p className="section-kicker">{kicker}</p>
      </div>
      <h3 id={id} className="mt-1 text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
        {heading}
      </h3>
    </div>
  );
}

export const CompanySettings: React.FC<CompanySettingsProps> = ({
  company,
  onSaveCompany,
  onExportBackup,
  onResetData,
  onStateReloaded,
}) => {
  const [form, setForm] = useState<CompanyProfile>({ ...company });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm({ ...company });
  }, [company]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHapticFeedback();
    onSaveCompany(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const next = await importDataFromJSON(text);
      onStateReloaded?.(next);
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 4000);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      e.target.value = '';
    }
  };

  const displayName = form.name?.trim() || company.name;
  const displayCity = [form.city, form.province].filter(Boolean).join(', ');

  return (
    <div>
      {/* Compact sub-header — replaces the old single-pill bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 flex items-center gap-3">
          <span className="hidden xs:flex w-9 h-9 rounded-xl bg-orange-600/10 dark:bg-orange-500/10 border border-orange-600/20 items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
                Company Profile
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                <HardDrive className="w-3 h-3" />
                On this device
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 truncate">
              Legal identity, statutory IDs, address &amp; signatory — saved locally.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 md:pb-10">
        <div className="md:mt-4 md:grid md:grid-cols-[212px_minmax(0,1fr)] lg:grid-cols-[232px_minmax(0,1fr)] md:gap-5 lg:gap-6 md:items-start">
          {/* Sticky live summary (tablet+) */}
          <aside className="hidden md:block md:sticky md:top-[72px] min-w-0">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-orange-600 text-white flex items-center justify-center p-1.5 shrink-0">
                  <BrandLogo className="w-full h-full text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{displayName}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    {form.tradingName || 'Trading name not set'}
                  </p>
                </div>
              </div>
              <dl className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400 font-semibold">TIN</dt>
                  <dd className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {form.tin || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400 font-semibold">RDO</dt>
                  <dd className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {form.rdoCode || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400 font-semibold">Base</dt>
                  <dd className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {displayCity || '—'}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-[10px] leading-relaxed text-slate-500 dark:text-slate-500">
                Live preview — updates as you type, before saving.
              </p>
            </div>
          </aside>

          {/* Form column */}
          <div className="min-w-0 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4 min-w-0">
              {/* Identity */}
              <section id="identity" aria-labelledby="sec-identity" className={cardCls}>
                <Kicker
                  icon={<Building2 className="w-3.5 h-3.5" aria-hidden />}
                  kicker="Section 01 · Identity"
                  heading="Corporate identity & legal information"
                  id="sec-identity"
                />

                <div className="flex items-center gap-3 p-3 bg-orange-50/60 dark:bg-slate-800/40 border border-orange-200/80 dark:border-slate-700/80 rounded-xl mb-4">
                  <div className="w-11 h-11 rounded-lg bg-orange-600 text-white flex items-center justify-center p-2 shadow-xs shrink-0">
                    <BrandLogo className="w-full h-full text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Active brand logo &amp; seal</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                      Used on payslips, print sheets, and headers.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="min-w-0">
                    <label htmlFor="co-name" className={labelCls}>
                      Registered Corporate Name <span className="text-orange-600" aria-hidden>*</span>
                    </label>
                    <input
                      id="co-name"
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={inputCls}
                      placeholder="e.g. KEGAMA HOTEL MANAGEMENT CORP."
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="co-trading" className={labelCls}>
                      Business / Trading Name
                    </label>
                    <input
                      id="co-trading"
                      type="text"
                      value={form.tradingName}
                      onChange={(e) => setForm({ ...form, tradingName: e.target.value })}
                      className={inputCls}
                      placeholder="e.g. KEGAMA Resort & Suites"
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="co-tin" className={labelCls}>
                      BIR Tax Identification Number (TIN) <span className="text-orange-600" aria-hidden>*</span>
                    </label>
                    <input
                      id="co-tin"
                      type="text"
                      required
                      value={form.tin}
                      onChange={(e) => setForm({ ...form, tin: e.target.value })}
                      className={`${inputCls} font-mono`}
                      placeholder="000-000-000-000"
                    />
                    <p className={helperCls}>12-digit TIN as shown on BIR Form 2303.</p>
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="co-rdo" className={labelCls}>
                      BIR Revenue District Office (RDO) <span className="text-orange-600" aria-hidden>*</span>
                    </label>
                    <input
                      id="co-rdo"
                      type="text"
                      required
                      value={form.rdoCode}
                      onChange={(e) => setForm({ ...form, rdoCode: e.target.value })}
                      className={inputCls}
                      placeholder="e.g. RDO 044 - Taguig City"
                    />
                  </div>
                </div>
              </section>

              {/* Statutory */}
              <section id="statutory" aria-labelledby="sec-statutory" className={cardCls}>
                <Kicker
                  icon={<ShieldCheck className="w-3.5 h-3.5" aria-hidden />}
                  kicker="Section 02 · Statutory"
                  heading="Government statutory employer numbers"
                  id="sec-statutory"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  <div className="min-w-0">
                    <label htmlFor="co-sss" className={labelCls}>
                      SSS Employer ID
                    </label>
                    <input
                      id="co-sss"
                      type="text"
                      value={form.sssEmployerNumber}
                      onChange={(e) => setForm({ ...form, sssEmployerNumber: e.target.value })}
                      className={`${inputCls} font-mono`}
                      placeholder="03-9999999-9"
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="co-philhealth" className={labelCls}>
                      PhilHealth Employer No.
                    </label>
                    <input
                      id="co-philhealth"
                      type="text"
                      value={form.philhealthEmployerNumber}
                      onChange={(e) => setForm({ ...form, philhealthEmployerNumber: e.target.value })}
                      className={`${inputCls} font-mono`}
                      placeholder="12-345678901-2"
                    />
                  </div>
                  <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                    <label htmlFor="co-pagibig" className={labelCls}>
                      Pag-IBIG / HDMF Employer ID
                    </label>
                    <input
                      id="co-pagibig"
                      type="text"
                      value={form.pagibigEmployerNumber}
                      onChange={(e) => setForm({ ...form, pagibigEmployerNumber: e.target.value })}
                      className={`${inputCls} font-mono`}
                      placeholder="2020-0000-0000"
                    />
                  </div>
                </div>
                <p className={`${helperCls} mt-3`}>Printed on statutory reports and remittance references.</p>
              </section>

              {/* Address */}
              <section id="address" aria-labelledby="sec-address" className={cardCls}>
                <Kicker
                  icon={<MapPin className="w-3.5 h-3.5" aria-hidden />}
                  kicker="Section 03 · Address"
                  heading="Principal business address & contact"
                  id="sec-address"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2 min-w-0">
                    <label htmlFor="co-addr1" className={labelCls}>
                      Building &amp; Street Address
                    </label>
                    <input
                      id="co-addr1"
                      type="text"
                      value={form.addressLine1}
                      onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                      className={inputCls}
                      placeholder="e.g. Km. 27 Aguinaldo Highway, Brgy. Panungyanan"
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="co-city" className={labelCls}>
                      City / Municipality
                    </label>
                    <input
                      id="co-city"
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className={inputCls}
                      placeholder="e.g. General Trias, Cavite"
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="co-province" className={labelCls}>
                      Province &amp; Postal Code
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        id="co-province"
                        type="text"
                        value={form.province}
                        placeholder="Province"
                        aria-label="Province"
                        onChange={(e) => setForm({ ...form, province: e.target.value })}
                        className={`${inputCls} min-w-0`}
                      />
                      <input
                        id="co-postal"
                        type="text"
                        value={form.postalCode}
                        placeholder="Postal"
                        aria-label="Postal code"
                        onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                        className={`${inputCls} min-w-0 font-mono`}
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="co-email" className={labelCls}>
                      Payroll Inquiries Email
                    </label>
                    <input
                      id="co-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={inputCls}
                      placeholder="payroll@company.ph"
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="co-phone" className={labelCls}>
                      Office Phone
                    </label>
                    <input
                      id="co-phone"
                      type="text"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={`${inputCls} font-mono`}
                      placeholder="(046) 000-0000"
                    />
                  </div>
                </div>
              </section>

              {/* Signatory */}
              <section id="signatory" aria-labelledby="sec-signatory" className={cardCls}>
                <Kicker
                  icon={<PenTool className="w-3.5 h-3.5" aria-hidden />}
                  kicker="Section 04 · Signatory"
                  heading="Authorized corporate signatory"
                  id="sec-signatory"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="min-w-0">
                    <label htmlFor="co-signame" className={labelCls}>
                      Signatory Full Name
                    </label>
                    <input
                      id="co-signame"
                      type="text"
                      value={form.authorizedSignatoryName}
                      onChange={(e) => setForm({ ...form, authorizedSignatoryName: e.target.value })}
                      className={`${inputCls} font-medium`}
                      placeholder="e.g. Juan D. Cruz"
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="co-sigtitle" className={labelCls}>
                      Signatory Corporate Title
                    </label>
                    <input
                      id="co-sigtitle"
                      type="text"
                      value={form.authorizedSignatoryTitle}
                      onChange={(e) => setForm({ ...form, authorizedSignatoryTitle: e.target.value })}
                      className={inputCls}
                      placeholder="e.g. General Manager"
                    />
                  </div>
                  <div className="sm:col-span-2 min-w-0">
                    <label htmlFor="co-footer" className={labelCls}>
                      Payslip Compliance Disclaimer / Footer
                    </label>
                    <textarea
                      id="co-footer"
                      rows={2}
                      value={form.payslipFooterText}
                      onChange={(e) => setForm({ ...form, payslipFooterText: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus-visible:outline-none outline-hidden transition resize-y min-h-[64px]"
                      placeholder="This payslip is system-generated…"
                    />
                    <p className={helperCls}>Shown at the bottom of every payslip.</p>
                  </div>
                </div>
              </section>

              {/* Save bar */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                <div aria-live="polite" className="min-h-[20px] flex-1">
                  {savedSuccess ? (
                    <span className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
                      Configuration updated successfully!
                    </span>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Changes save to this device only. Required fields are marked
                      <span className="text-orange-600 font-bold"> *</span>.
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 min-h-[44px] py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-600/20 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                >
                  <Save className="w-4 h-4" aria-hidden />
                  <span>Save Company Configuration</span>
                </button>
              </div>
            </form>

            {/* Backup & Data */}
            <section id="backup" aria-labelledby="sec-backup" className={`${cardCls} space-y-3.5`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" aria-hidden />
                  <p className="section-kicker">Section 05 · Backup</p>
                </div>
                <h3 id="sec-backup" className="mt-1 text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Backup &amp; data (this device)
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                  Export saves a JSON copy of everything on this device. Import restores from that file.
                </p>
              </div>

              <div aria-live="polite" className="space-y-2">
                {importError && (
                  <div
                    className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2"
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />
                    <span>{importError}</span>
                  </div>
                )}
                {importSuccess && (
                  <div
                    className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2"
                    role="status"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
                    <span>Backup restored successfully.</span>
                  </div>
                )}
              </div>

              {!confirmReset ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback();
                      onExportBackup?.();
                    }}
                    className="flex items-center justify-center gap-2 px-4 min-h-[44px] py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs transition active:scale-95 hover:bg-slate-700 dark:hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                  >
                    <Download className="w-4 h-4" aria-hidden />
                    <span>Export Backup</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback();
                      fileRef.current?.click();
                    }}
                    className="flex items-center justify-center gap-2 px-4 min-h-[44px] py-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl font-bold text-xs transition active:scale-95 hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                  >
                    <Upload className="w-4 h-4" aria-hidden />
                    <span>Import Backup</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback();
                      setConfirmReset(true);
                    }}
                    className="flex items-center justify-center gap-2 px-4 min-h-[44px] py-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-200 rounded-xl font-bold text-xs transition active:scale-95 hover:bg-rose-100 dark:hover:bg-rose-950/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                    <span>Reset Data</span>
                  </button>
                </div>
              ) : (
                <div
                  className="rounded-xl border border-rose-200 dark:border-rose-800/70 bg-rose-50/70 dark:bg-rose-950/30 p-3.5"
                  role="alertdialog"
                  aria-label="Confirm data reset"
                  aria-describedby="reset-desc"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 mt-0.5 text-rose-600 dark:text-rose-300 shrink-0" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-rose-900 dark:text-rose-100">
                        Reset all data on this device?
                      </p>
                      <p id="reset-desc" className="mt-0.5 text-[11px] leading-relaxed text-rose-800/90 dark:text-rose-200/80">
                        This clears employees, payroll runs, and company info. Export a backup first — this
                        can&apos;t be undone.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
                    >
                      Keep my data
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback();
                        setConfirmReset(false);
                        onResetData?.();
                      }}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden />
                      Yes, reset
                    </button>
                  </div>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportFile}
                aria-hidden
                tabIndex={-1}
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
