import React, { useEffect, useState } from 'react';
import { AppState, CompanyProfile, Employee, PayrollRun, PayslipItem, PayrollStatus } from './types/payroll';
import {
  loadInitialState,
  saveState,
  resetToDefaultData,
  exportDataAsJSON,
} from './utils/storage';
import {
  checkBackendHealth,
  updateBackendCompany,
  saveBackendEmployee,
  toggleBackendEmployeeStatus,
  createBackendPayrollRun,
  updateBackendPayrollStatus,
  deleteBackendPayrollRun,
  updateBackendPayslip,
} from './services/api';
import { Navigation, TabType } from './components/layout/Navigation';
import { Header } from './components/layout/Header';
import { PayrollRunList } from './components/payroll/PayrollRunList';
import { PayrollRunDetail } from './components/payroll/PayrollRunDetail';
import { CreatePayrollRunModal } from './components/payroll/CreatePayrollRunModal';
import { EmployeeList } from './components/employees/EmployeeList';
import { EmployeeFormModal } from './components/employees/EmployeeFormModal';
import { CompanySettings } from './components/settings/CompanySettings';
import { ReportsAnalytics } from './components/reports/ReportsAnalytics';
import { PayslipPreviewModal } from './components/payslip/PayslipPreviewModal';
import { BulkPayslipPrintView } from './components/payslip/BulkPayslipPrintView';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { Loader2 } from 'lucide-react';
import { AppUpdateModal } from './components/common/AppUpdateModal';
import {
  fetchVersionManifest,
  isUpdateAvailable,
  isVersionDismissed,
  dismissVersion,
  AppVersionInfo,
  CURRENT_APP_VERSION,
} from './services/versionService';

export const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AppState | null>(null);
  const [currentTab, setCurrentTab] = useState<TabType>('runs');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // Modal states
  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [activePreviewPayslip, setActivePreviewPayslip] = useState<PayslipItem | null>(null);
  const [activeBulkPrintRun, setActiveBulkPrintRun] = useState<PayrollRun | null>(null);

  // In-App Version & Self-Update state
  const [updateManifest, setUpdateManifest] = useState<AppVersionInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const checkAppVersion = async (manual: boolean = false) => {
    try {
      const manifest = await fetchVersionManifest();
      if (manifest && isUpdateAvailable(manifest)) {
        setUpdateManifest(manifest);
        if (manual || !isVersionDismissed(manifest.latestVersion) || manifest.forceUpdate) {
          setShowUpdateModal(true);
        }
      } else if (manual) {
        alert(`You are running the latest version of Kegama Residences (v${CURRENT_APP_VERSION}).`);
      }
    } catch (err) {
      console.warn('[App] Version check failed:', err);
    }
  };

  // Initialize App state & Capacitor Mobile status bar
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

      // Check backend health
      try {
        const health = await checkBackendHealth();
        setBackendOnline(health.isOnline);
      } catch {
        setBackendOnline(false);
      }

      const loaded = await loadInitialState();
      setState(loaded);
      setLoading(false);

      // Check for application software updates
      checkAppVersion();
    }

    init();

    // Heartbeat check every 30 seconds with RAM and visibility awareness
    const interval = setInterval(async () => {
      // Pause checks and memory allocation when the browser tab is hidden or offline
      if (typeof document !== 'undefined' && document.hidden) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setBackendOnline(false);
        return;
      }

      try {
        const health = await checkBackendHealth({ quick: true });
        setBackendOnline(health.isOnline);
      } catch {
        setBackendOnline(false);
      }
    }, 30000);

    // Refresh status immediately when the user returns to the application tab
    const handleVisibilityChange = async () => {
      if (typeof document !== 'undefined' && !document.hidden && navigator.onLine) {
        try {
          const health = await checkBackendHealth({ quick: true });
          setBackendOnline(health.isOnline);
        } catch {
          setBackendOnline(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const updateStateAndPersist = (updater: (prev: AppState) => AppState) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      saveState(next);
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

  // Handle Payroll Run Actions
  const handleCreateRun = (newRun: PayrollRun) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      payrollRuns: [newRun, ...prev.payrollRuns],
      activePayrollRunId: newRun.id,
    }));
    createBackendPayrollRun(newRun).catch(() => {});
    setShowNewRunModal(false);
    setSelectedRunId(newRun.id);
  };

  const handleUpdateRunStatus = (runId: string, status: PayrollStatus) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      payrollRuns: prev.payrollRuns.map((r) =>
        r.id === runId ? { ...r, status, updatedAt: new Date().toISOString() } : r
      ),
    }));
    updateBackendPayrollStatus(runId, status).catch(() => {});
  };

  const handleUpdatePayslip = (runId: string, updatedPayslip: PayslipItem) => {
    updateStateAndPersist((prev) => {
      const runs = prev.payrollRuns.map((r) => {
        if (r.id !== runId) return r;
        const newPayslips = r.payslips.map((p) =>
          p.id === updatedPayslip.id ? updatedPayslip : p
        );
        return {
          ...r,
          payslips: newPayslips,
          totalGrossPay: Number(
            newPayslips.reduce((s, p) => s + p.grossEarnings, 0).toFixed(2)
          ),
          totalDeductions: Number(
            newPayslips.reduce((s, p) => s + p.totalDeductions, 0).toFixed(2)
          ),
          totalNetPay: Number(
            newPayslips.reduce((s, p) => s + p.netPay, 0).toFixed(2)
          ),
          totalWithholdingTax: Number(
            newPayslips.reduce((s, p) => s + p.statutory.withholdingTax, 0).toFixed(2)
          ),
          totalSssEmployee: Number(
            newPayslips.reduce((s, p) => s + p.statutory.sssEmployee, 0).toFixed(2)
          ),
          totalSssEmployer: Number(
            newPayslips.reduce((s, p) => s + p.statutory.sssEmployer, 0).toFixed(2)
          ),
          totalPhilhealthEmployee: Number(
            newPayslips.reduce((s, p) => s + p.statutory.philhealthEmployee, 0).toFixed(2)
          ),
          totalPhilhealthEmployer: Number(
            newPayslips.reduce((s, p) => s + p.statutory.philhealthEmployer, 0).toFixed(2)
          ),
          totalPagibigEmployee: Number(
            newPayslips.reduce((s, p) => s + p.statutory.pagibigEmployee, 0).toFixed(2)
          ),
          totalPagibigEmployer: Number(
            newPayslips.reduce((s, p) => s + p.statutory.pagibigEmployer, 0).toFixed(2)
          ),
        };
      });
      return { ...prev, payrollRuns: runs };
    });
    updateBackendPayslip(runId, updatedPayslip).catch(() => {});
  };

  const handleDeleteRun = (runId: string) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      payrollRuns: prev.payrollRuns.filter((r) => r.id !== runId),
    }));
    deleteBackendPayrollRun(runId).catch(() => {});
    if (selectedRunId === runId) {
      setSelectedRunId(null);
    }
  };

  // Employee Actions
  const handleSaveEmployee = (emp: Employee) => {
    const isNew = !state.employees.some((e) => e.id === emp.id);
    updateStateAndPersist((prev) => {
      const exists = prev.employees.some((e) => e.id === emp.id);
      const employees = exists
        ? prev.employees.map((e) => (e.id === emp.id ? emp : e))
        : [emp, ...prev.employees];
      return { ...prev, employees };
    });
    saveBackendEmployee(emp, isNew).catch(() => {});
    setEditingEmployee(null);
    setShowNewEmployeeModal(false);
  };

  const handleToggleEmployeeStatus = (empId: string) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      employees: prev.employees.map((e) =>
        e.id === empId
          ? { ...e, status: e.status === 'active' ? 'inactive' : 'active' }
          : e
      ),
    }));
    toggleBackendEmployeeStatus(empId).catch(() => {});
  };

  // Company Settings
  const handleSaveCompany = (company: CompanyProfile) => {
    updateStateAndPersist((prev) => ({
      ...prev,
      company,
    }));
    updateBackendCompany(company).catch(() => {});
  };

  const handleResetData = async () => {
    const refreshed = await resetToDefaultData();
    setState(refreshed);
    setSelectedRunId(refreshed.payrollRuns[0]?.id || null);
  };

  const getHeaderInfo = () => {
    switch (currentTab) {
      case 'runs':
        return {
          title: selectedRun ? selectedRun.periodName : 'Payroll Cycles',
        };
      case 'employees':
        return {
          title: 'Employees',
        };
      case 'reports':
        return {
          title: 'Statutory Reports',
        };
      case 'settings':
        return {
          title: 'Company & Database Settings',
        };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Responsive Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'runs') setSelectedRunId(null);
        }}
        onNewPayroll={() => setShowNewRunModal(true)}
        company={state.company}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <Header
          title={headerInfo.title}
          company={state.company}
          backendOnline={backendOnline}
          updateAvailable={!!updateManifest && isUpdateAvailable(updateManifest)}
          onOpenUpdateModal={() => setShowUpdateModal(true)}
        />

        <div className="flex-1 overflow-y-auto">
          {/* Tab 1: Payroll Runs */}
          {currentTab === 'runs' && (
            <>
              {selectedRun ? (
                <PayrollRunDetail
                  run={selectedRun}
                  company={state.company}
                  onBack={() => setSelectedRunId(null)}
                  onUpdateRunStatus={handleUpdateRunStatus}
                  onUpdatePayslip={handleUpdatePayslip}
                  onOpenPayslipModal={(payslip) => setActivePreviewPayslip(payslip)}
                  onBulkPrint={(run) => setActiveBulkPrintRun(run)}
                />
              ) : (
                <PayrollRunList
                  runs={state.payrollRuns}
                  company={state.company}
                  onSelectRun={(run) => setSelectedRunId(run.id)}
                  onNewRun={() => setShowNewRunModal(true)}
                  onBulkPrintRun={(run) => setActiveBulkPrintRun(run)}
                  onDeleteRun={handleDeleteRun}
                />
              )}
            </>
          )}

          {/* Tab 2: Employees */}
          {currentTab === 'employees' && (
            <EmployeeList
              employees={state.employees}
              onAddEmployee={() => setShowNewEmployeeModal(true)}
              onEditEmployee={(emp) => setEditingEmployee(emp)}
              onToggleStatus={handleToggleEmployeeStatus}
              onPreviewAdHocPayslip={(payslip) => setActivePreviewPayslip(payslip)}
            />
          )}

          {/* Tab 3: Reports */}
          {currentTab === 'reports' && (
            <ReportsAnalytics
              runs={state.payrollRuns}
              employees={state.employees}
              company={state.company}
            />
          )}

          {/* Tab 4: Settings */}
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

      {/* Modal: Create Payroll Cycle */}
      {showNewRunModal && (
        <CreatePayrollRunModal
          employees={state.employees}
          company={state.company}
          onClose={() => setShowNewRunModal(false)}
          onCreateRun={handleCreateRun}
        />
      )}

      {/* Modal: New Employee */}
      {showNewEmployeeModal && (
        <EmployeeFormModal
          company={state.company}
          onClose={() => setShowNewEmployeeModal(false)}
          onSave={handleSaveEmployee}
        />
      )}

      {/* Modal: Edit Employee */}
      {editingEmployee && (
        <EmployeeFormModal
          employee={editingEmployee}
          company={state.company}
          onClose={() => setEditingEmployee(null)}
          onSave={handleSaveEmployee}
        />
      )}

      {/* Modal: Fullscreen Payslip Preview & Print Inspector */}
      {activePreviewPayslip && (
        <PayslipPreviewModal
          payslip={activePreviewPayslip}
          company={state.company}
          allPayslips={selectedRun ? selectedRun.payslips : []}
          onClose={() => setActivePreviewPayslip(null)}
          onSelectPayslip={(p) => setActivePreviewPayslip(p)}
        />
      )}

      {/* Modal: Bulk Print View */}
      {activeBulkPrintRun && (
        <BulkPayslipPrintView
          payrollRun={activeBulkPrintRun}
          company={state.company}
          onClose={() => setActiveBulkPrintRun(null)}
        />
      )}

      {/* Modal: Self-Updating App Version Modal */}
      {updateManifest && (
        <AppUpdateModal
          manifest={updateManifest}
          isOpen={showUpdateModal}
          onClose={() => {
            dismissVersion(updateManifest.latestVersion);
            setShowUpdateModal(false);
          }}
        />
      )}
    </div>
  );
};

export default App;
