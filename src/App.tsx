import React, { useEffect, useState } from 'react';
import { AppState, CompanyProfile, DayRecord, Employee, PayrollRun, PayslipItem, PayrollStatus } from './types/payroll';
import { loadInitialState, saveState, resetToDefaultData, exportDataAsJSON } from './utils/storage';
import { Navigation, TabType } from './components/layout/Navigation';
import { Header } from './components/layout/Header';
import { PayrollRunList } from './components/payroll/PayrollRunList';
import { PayrollRunDetail } from './components/payroll/PayrollRunDetail';
import { CreatePayrollRunModal } from './components/payroll/CreatePayrollRunModal';
import { EmployeeList } from './components/employees/EmployeeList';
import { EmployeeFormModal } from './components/employees/EmployeeFormModal';
import { CompanySettings } from './components/settings/CompanySettings';
import { ScheduleTab } from './components/schedule/ScheduleTab';
import { ReportsAnalytics } from './components/reports/ReportsAnalytics';
import { setDayRecord } from './utils/attendance';
import { PayslipPreviewModal } from './components/payslip/PayslipPreviewModal';
import { BulkPayslipPrintView } from './components/payslip/BulkPayslipPrintView';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { Loader2 } from 'lucide-react';
import { summarizePayslips } from './utils/calculations';
import { checkForUpdates, applyUpdateSilently } from './services/updateService';

export const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AppState | null>(null);
  const [currentTab, setCurrentTab] = useState<TabType>('runs');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [activePreviewPayslip, setActivePreviewPayslip] = useState<PayslipItem | null>(null);
  const [activeBulkPrintRun, setActiveBulkPrintRun] = useState<PayrollRun | null>(null);

  useEffect(() => {
    async function init() {
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#020617' });
        } catch {
          // Non-native fallback
        }
      }
      const loaded = await loadInitialState();
      setState(loaded);
      setLoading(false);
    }
    init();

    // Silent background check for updates after initial load (no prompts, zero browser redirect)
    const updateTimer = setTimeout(() => {
      void checkForUpdates()
        .then((update) => {
          if (update.available) {
            console.log('[Kegama Updater] New release available:', update.latestVersion);
            void applyUpdateSilently(update);
          }
        })
        .catch((err) => {
          console.warn('[Kegama Updater] Background check failed:', err);
        });
    }, 4000);

    return () => clearTimeout(updateTimer);
  }, []);

  const updateStateAndPersist = (updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      void saveState(next);
      return next;
    });
  };

  if (loading || !state) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-7 h-7 animate-spin text-orange-500 mb-2" />
        <p className="text-xs font-medium text-slate-400">Loading Kegama Residences...</p>
      </div>
    );
  }

  const selectedRun = state.payrollRuns.find((r) => r.id === selectedRunId);

  const handleCreateRun = (newRun: PayrollRun) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      payrollRuns: [newRun, ...prev.payrollRuns],
      activePayrollRunId: newRun.id,
    }));
    setShowNewRunModal(false);
    setSelectedRunId(newRun.id);
  };

  const handleUpdateRunStatus = (runId: string, status: PayrollStatus) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      payrollRuns: prev.payrollRuns.map((r) =>
        r.id === runId ? { ...r, status, updatedAt: new Date().toISOString() } : r,
      ),
    }));
  };

  const handleUpdatePayslip = (runId: string, updatedPayslip: PayslipItem) => {
    updateStateAndPersist((prev) => {
      const runs = prev.payrollRuns.map((r) => {
        if (r.id !== runId) return r;
        const newPayslips = r.payslips.map((p) => (p.id === updatedPayslip.id ? updatedPayslip : p));
        return { ...r, payslips: newPayslips, ...summarizePayslips(newPayslips) };
      });
      return { ...prev, payrollRuns: runs };
    });
  };

  const handleDeleteRun = (runId: string) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      payrollRuns: prev.payrollRuns.filter((r) => r.id !== runId),
    }));
    if (selectedRunId === runId) setSelectedRunId(null);
  };

  const handleSaveEmployee = (emp: Employee) => {
    updateStateAndPersist((prev) => {
      const exists = prev.employees.some((e) => e.id === emp.id);
      const employees = exists ? prev.employees.map((e) => (e.id === emp.id ? emp : e)) : [emp, ...prev.employees];
      return { ...prev, employees };
    });
    setEditingEmployee(null);
    setShowNewEmployeeModal(false);
  };

  const handleToggleEmployeeStatus = (empId: string) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      employees: prev.employees.map((e) =>
        e.id === empId ? { ...e, status: e.status === 'active' ? 'inactive' : 'active' } : e,
      ),
    }));
  };

  const handleSaveCompany = (company: CompanyProfile) => {
    updateStateAndPersist((prev) => ({ ...prev, company }));
  };

  const handleSaveDay = (employeeId: string, iso: string, rec: DayRecord | undefined) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      attendance: setDayRecord(prev.attendance ?? {}, employeeId, iso, rec),
    }));
  };

  const handleResetData = async () => {
    const refreshed = await resetToDefaultData();
    setState(refreshed);
    setSelectedRunId(refreshed.payrollRuns[0]?.id || null);
  };

  const getHeaderInfo = () => {
    switch (currentTab) {
      case 'runs':
        return { title: selectedRun ? selectedRun.periodName : 'Payroll Cycles' };
      case 'employees':
        return { title: 'Employees' };
      case 'schedule':
        return { title: 'Work Schedule' };
      case 'reports':
        return { title: 'Statutory Reports' };
      case 'settings':
        return { title: 'Company Settings' };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="page-surface min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row pb-16 md:pb-0">
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'runs') setSelectedRunId(null);
        }}
        onNewPayroll={() => setShowNewRunModal(true)}
        company={state.company}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <Header title={headerInfo.title} company={state.company} />

        <div className="flex-1 overflow-y-auto">
          {currentTab === 'runs' && (
            <>
              {selectedRun ? (
                <PayrollRunDetail
                  run={selectedRun}
                  company={state.company}
                  employees={state.employees}
                  onBack={() => setSelectedRunId(null)}
                  onUpdateRunStatus={handleUpdateRunStatus}
                  onUpdatePayslip={handleUpdatePayslip}
                  onOpenPayslipModal={(payslip) => setActivePreviewPayslip(payslip)}
                  onBulkPrint={(run) => setActiveBulkPrintRun(run)}
                />
              ) : (
                <PayrollRunList
                  runs={state.payrollRuns}
                  onSelectRun={(run) => setSelectedRunId(run.id)}
                  onNewRun={() => setShowNewRunModal(true)}
                  onBulkPrintRun={(run) => setActiveBulkPrintRun(run)}
                  onDeleteRun={handleDeleteRun}
                />
              )}
            </>
          )}

          {currentTab === 'employees' && (
            <EmployeeList
              employees={state.employees}
              onAddEmployee={() => setShowNewEmployeeModal(true)}
              onEditEmployee={(emp) => setEditingEmployee(emp)}
              onToggleStatus={handleToggleEmployeeStatus}
              onPreviewAdHocPayslip={(payslip) => setActivePreviewPayslip(payslip)}
            />
          )}

          {currentTab === 'schedule' && (
            <ScheduleTab
              employees={state.employees}
              attendance={state.attendance ?? {}}
              onSaveDay={handleSaveDay}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsAnalytics runs={state.payrollRuns} employees={state.employees} company={state.company} />
          )}

          {currentTab === 'settings' && (
            <CompanySettings
              company={state.company}
              appState={state}
              onSaveCompany={handleSaveCompany}
              onExportBackup={() => exportDataAsJSON(state)}
              onResetData={handleResetData}
              onStateReloaded={(newState) => setState(newState)}
            />
          )}
        </div>
      </main>

      {showNewRunModal && (
        <CreatePayrollRunModal
          employees={state.employees}
          company={state.company}
          runs={state.payrollRuns}
          attendance={state.attendance ?? {}}
          onClose={() => setShowNewRunModal(false)}
          onCreateRun={handleCreateRun}
        />
      )}

      {showNewEmployeeModal && (
        <EmployeeFormModal
          onClose={() => setShowNewEmployeeModal(false)}
          onSave={handleSaveEmployee}
        />
      )}

      {editingEmployee && (
        <EmployeeFormModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSave={handleSaveEmployee}
        />
      )}

      {activePreviewPayslip && (
        <PayslipPreviewModal
          payslip={activePreviewPayslip}
          company={state.company}
          allPayslips={selectedRun ? selectedRun.payslips : []}
          onClose={() => setActivePreviewPayslip(null)}
          onSelectPayslip={(p) => setActivePreviewPayslip(p)}
        />
      )}

      {activeBulkPrintRun && (
        <BulkPayslipPrintView
          payrollRun={activeBulkPrintRun}
          company={state.company}
          onClose={() => setActiveBulkPrintRun(null)}
        />
      )}
    </div>
  );
};

export default App;
