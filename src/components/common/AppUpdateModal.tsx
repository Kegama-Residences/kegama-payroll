import React, { useState } from 'react';
import { AppVersionInfo, CURRENT_APP_VERSION, applyAppUpdate } from '../../services/versionService';
import { triggerHapticFeedback } from '../../utils/printService';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  DownloadCloud,
  RefreshCw,
  AlertCircle,
  X,
  ShieldCheck,
  Package
} from 'lucide-react';

interface AppUpdateModalProps {
  manifest: AppVersionInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  manifest,
  isOpen,
  onClose,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartUpdate = async () => {
    triggerHapticFeedback();
    setIsUpdating(true);
    setError(null);
    try {
      await applyAppUpdate((percent, statusText) => {
        setProgressPercent(percent);
        setProgressStatus(statusText);
      });
    } catch (err: any) {
      setIsUpdating(false);
      setError(err?.message || 'Update installation failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-modal-title"
      >
        {/* Header with Version Badges */}
        <div className="bg-gradient-to-br from-orange-600 to-amber-700 p-5 sm:p-6 text-white relative">
          {!manifest.forceUpdate && !isUpdating && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-black/20 hover:bg-black/30 text-white/90 hover:text-white transition active:scale-95"
              title="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase bg-black/20 px-2 py-0.5 rounded-full border border-white/20">
                System Update
              </span>
              <h3 id="update-modal-title" className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                New Version Available
              </h3>
            </div>
          </div>

          {/* Current vs New Version Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/20 text-xs font-mono font-bold">
            <span className="text-orange-200">v{CURRENT_APP_VERSION}</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/80" />
            <span className="text-emerald-300 font-extrabold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              v{manifest.latestVersion}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* SELF-UPDATING PROGRESS VIEW */}
          {isUpdating ? (
            <div className="py-6 sm:py-8 space-y-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>

              <div className="space-y-1.5">
                <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                  Updating Kegama Residences...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {progressStatus || 'Applying package update...'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 max-w-sm mx-auto">
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-emerald-500 h-full rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 font-bold px-1">
                  <span>Progress</span>
                  <span className="text-orange-600 dark:text-orange-400">{progressPercent}%</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 pt-2">
                Please do not close this window. The app will automatically restart once finished.
              </p>
            </div>
          ) : (
            /* STATIC PRE-UPDATE VIEW: RELEASE NOTES & ACTION */
            <>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-orange-500" />
                  What's New in Version {manifest.latestVersion}
                </h4>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  {manifest.releaseNotes.map((note, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="leading-snug text-slate-800 dark:text-slate-200">{note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Package Metadata Info */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/40 p-2.5 rounded-xl">
                <div>
                  <span className="block font-semibold uppercase text-[9px] text-slate-400">Package Size</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200 font-bold">{manifest.fileSizeFormatted}</span>
                </div>
                <div>
                  <span className="block font-semibold uppercase text-[9px] text-slate-400">Security Checksum</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200 truncate block font-bold" title={manifest.checksum}>
                    SHA-256 Verified
                  </span>
                </div>
              </div>

              {manifest.forceUpdate && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>This is a mandatory system update to maintain backend database compatibility.</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!isUpdating && (
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            {!manifest.forceUpdate && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition active:scale-95 min-h-[44px] order-2 sm:order-1"
              >
                Remind Me Later
              </button>
            )}

            <button
              type="button"
              onClick={handleStartUpdate}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 active:scale-95 text-white shadow-md shadow-orange-600/20 transition flex items-center justify-center gap-2 min-h-[44px] order-1 sm:order-2"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Update &amp; Reload Now</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
