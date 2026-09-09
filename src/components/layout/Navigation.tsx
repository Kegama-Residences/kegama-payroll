import React from 'react';
import {
  CalendarDays,
  CalendarCheck,
  Users,
  Plus,
  BarChart3,
  Settings
} from 'lucide-react';
import { triggerHapticFeedback } from '../../utils/printService';
import { CompanyProfile } from '../../types/payroll';
import { BrandLogo } from '../common/BrandLogo';

export type TabType = 'runs' | 'employees' | 'schedule' | 'reports' | 'settings';

interface NavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onNewPayroll: () => void;
  company: CompanyProfile;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  onNewPayroll,
  company,
}) => {
  const handleTabClick = (tab: TabType) => {
    triggerHapticFeedback();
    onSelectTab(tab);
  };

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'runs', label: 'Payroll Cycles', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'employees', label: 'Employees', icon: <Users className="w-4 h-4" /> },
    { id: 'schedule', label: 'Schedule', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'reports', label: 'Statutory Reports', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'settings', label: 'Company Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Tablet & Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-950 text-slate-200 border-r border-slate-800/80 flex-shrink-0 h-screen sticky top-0">
        {/* Branding */}
        <div className="p-5 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 text-white flex items-center justify-center font-black shadow-lg shadow-orange-950/40 flex-shrink-0 p-2">
              <BrandLogo className="w-full h-full text-white" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-[13px] text-white tracking-tight leading-tight">
                  Kegama Residences
                </h1>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
              </div>
               <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {company.tradingName || 'Hotel & Residences'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Create Cut-off - Joy Orange */}
        <div className="p-4 pb-3">
          <button
            onClick={() => {
              triggerHapticFeedback();
              onNewPayroll();
            }}
            className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-3.5 rounded-xl shadow-lg shadow-orange-950/30 transition active:scale-[0.98] text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Process New Cut-Off</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 pt-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-xs transition text-left ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-300 font-bold border border-orange-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className={isActive ? 'text-orange-500' : ''}>{item.icon}</div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-1 pb-safe flex items-center justify-around shadow-2xl">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`flex flex-col items-center py-2 px-2 transition text-[10px] font-medium ${
                isActive
                  ? 'text-orange-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded ${isActive ? 'bg-orange-600/20 text-orange-400' : ''}`}>
                {item.icon}
              </div>
              <span className="mt-0.5">{item.label}</span>
            </button>
          );
        })}

        {/* Mobile Fast Action */}
        <button
          onClick={() => {
            triggerHapticFeedback();
            onNewPayroll();
          }}
          className="flex flex-col items-center py-1 px-2 text-[10px] font-medium text-orange-400"
        >
          <div className="w-9 h-9 -mt-4 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-600/30 border-2 border-slate-950 active:scale-95 transition">
            <Plus className="w-4 h-4" />
          </div>
          <span className="mt-0.5 text-slate-300">New Run</span>
        </button>
      </nav>
    </>
  );
};
