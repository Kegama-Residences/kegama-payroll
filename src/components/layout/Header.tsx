import React from 'react';
import { CompanyProfile } from '../../types/payroll';
import { BrandLogo } from '../common/BrandLogo';
import { CalendarDays, HardDrive } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  company: CompanyProfile;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, company }) => {
  return (
    <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-7 py-3 flex items-center justify-between sticky top-0 z-20 pt-safe">
      <div className="min-w-0">
        <p className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-600 dark:text-orange-400 mb-0.5">
          <CalendarDays className="w-3 h-3" />
          Payroll workspace
        </p>
        <h1 className="text-base sm:text-xl font-extrabold text-slate-950 dark:text-white tracking-tight truncate">
          {title}
        </h1>
        {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div
          title="Local app: all data stays on this device"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-semibold">On this device</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="md:hidden w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center p-1.5 shadow-sm flex-shrink-0">
            <BrandLogo className="w-full h-full text-white" />
          </div>
          <span className="hidden xs:block text-xs text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[150px] sm:max-w-[220px]">
            {company.name}
          </span>
        </div>
      </div>
    </header>
  );
};
