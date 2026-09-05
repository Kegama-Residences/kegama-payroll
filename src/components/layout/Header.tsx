import React from 'react';
import { CompanyProfile } from '../../types/payroll';
import { BrandLogo } from '../common/BrandLogo';
import { Database, HardDrive, Sparkles } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  company: CompanyProfile;
  backendOnline?: boolean;
  updateAvailable?: boolean;
  onOpenUpdateModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  company,
  backendOnline = true,
  updateAvailable = false,
  onOpenUpdateModal,
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-20 pt-safe">
      <div>
        <h1 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Backend & Storage Status Badge */}
        <div
          title={backendOnline ? 'Central SQLite Database Connected (WAL Mode)' : 'Offline mode: Using persistent device cache'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
            backendOnline
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
          }`}
        >
          {backendOnline ? (
            <>
              <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline font-semibold">SQLite Online</span>
            </>
          ) : (
            <>
              <HardDrive className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="hidden sm:inline font-semibold">Local Offline</span>
            </>
          )}
        </div>

        {/* In-App Software Update Available Badge */}
        {updateAvailable && onOpenUpdateModal && (
          <button
            type="button"
            onClick={onOpenUpdateModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/40 hover:border-orange-500 transition active:scale-95 shadow-xs animate-pulse"
            title="A new application version is ready. Click to inspect and update."
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span className="font-semibold">Update Ready</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="md:hidden w-7 h-7 rounded-md bg-orange-600 text-white flex items-center justify-center p-1 shadow-xs flex-shrink-0">
            <BrandLogo className="w-full h-full text-white" />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[150px] sm:max-w-[220px]">
            {company.name}
          </span>
        </div>
      </div>
    </header>
  );
};
