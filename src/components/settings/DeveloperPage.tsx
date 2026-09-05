import React, { useState, useEffect } from 'react';
import { CompanyProfile, AppState } from '../../types/payroll';
import { triggerHapticFeedback } from '../../utils/printService';
import { Capacitor } from '@capacitor/core';
import {
  Database,
  HardDrive,
  RefreshCw,
  FileDown,
  Key,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Smartphone,
  Check,
  CheckCircle2,
  DownloadCloud,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Layers,
  Activity,
  Server,
  Play,
  ArrowLeft,
  Search,
  Sparkles,
  AlertTriangle,
  X
} from 'lucide-react';
import {
  checkBackendHealth,
  fetchBackendStorageStats,
  createBackendBackupSnapshot,
  fetchBackendBackups,
  getBackupDownloadUrl,
  getApiBaseUrl,
  setCustomApiUrl,
  syncStateToBackend,
  getApiSecret,
  setCustomApiSecret,
  checkBackendDatabaseIntegrity,
  fetchBackendAuditLogs,
  executeRawEndpoint,
} from '../../services/api';
import { AppUpdateModal } from '../common/AppUpdateModal';
import {
  fetchVersionManifest,
  CURRENT_APP_VERSION,
  AppVersionInfo,
} from '../../services/versionService';

interface DeveloperPageProps {
  company: CompanyProfile;
  appState: AppState;
  onSaveCompany?: (updated: CompanyProfile) => void;
  onExportBackup?: () => void;
  onResetData?: () => void;
  onStateReloaded?: (newState: AppState) => void;
  onBackToCompany: () => void;
  onLockDeveloperMode?: () => void;
}

type DevSection = 'backend' | 'mobile_security' | 'audit_logs' | 'api_tester';

export const DeveloperPage: React.FC<DeveloperPageProps> = ({
  company,
  appState,
  onExportBackup,
  onResetData,
  onStateReloaded,
  onBackToCompany,
  onLockDeveloperMode,
}) => {
  const [activeSection, setActiveSection] = useState<DevSection>('backend');

  // Backend & Diagnostics State
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [dbStats, setDbStats] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [customServerUrl, setCustomServerUrlInput] = useState(getApiBaseUrl());
  const [storageLoading, setStorageLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [integrityStatus, setIntegrityStatus] = useState<any>(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);

  // Security & Secret State
  const [apiSecretInput, setApiSecretInput] = useState(getApiSecret());
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [secretSaved, setSecretSaved] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const SHA256_FINGERPRINT = '74:F0:5F:0B:14:B2:A6:D7:61:45:2C:9F:B5:1D:25:74:55:34:2A:FC:29:85:8E:21:55:F9:36:C4:74:0F:CD:65';

  // API Tester State
  const [testEndpoint, setTestEndpoint] = useState('/api/health');
  const [testMethod, setTestMethod] = useState('GET');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [copiedResponse, setCopiedResponse] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState('');

  // Version Manifest & OTA Self-Updater State
  const [devManifest, setDevManifest] = useState<AppVersionInfo | null>(null);
  const [devVersionLoading, setDevVersionLoading] = useState(false);
  const [showDevUpdateModal, setShowDevUpdateModal] = useState(false);

  const loadDevVersionManifest = async (queryParam?: string) => {
    setDevVersionLoading(true);
    try {
      const manifest = await fetchVersionManifest(queryParam);
      setDevManifest(manifest);
      if (queryParam) {
        setStatusMessage(`Version manifest simulated: v${manifest?.latestVersion}`);
        setTimeout(() => setStatusMessage(null), 3500);
      }
    } catch {
      // Ignore
    } finally {
      setDevVersionLoading(false);
    }
  };

  const loadBackendDiagnostics = async (forceFresh: boolean = false) => {
    setStorageLoading(true);
    try {
      const health = await checkBackendHealth({ forceRefresh: forceFresh });
      setIsBackendOnline(health.isOnline);
      if (health.isOnline) {
        const stats = await fetchBackendStorageStats();
        setDbStats(stats);
        const backupList = await fetchBackendBackups();
        setBackups(backupList);
      }
    } catch {
      setIsBackendOnline(false);
    } finally {
      setStorageLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const logs = await fetchBackendAuditLogs(60);
      setAuditLogs(logs);
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    loadBackendDiagnostics();
    loadDevVersionManifest();
  }, []);

  useEffect(() => {
    if (activeSection === 'audit_logs') {
      loadAuditLogs();
    }
  }, [activeSection]);

  const handleCreateServerBackup = async () => {
    triggerHapticFeedback();
    setStorageLoading(true);
    try {
      const res = await createBackendBackupSnapshot();
      setStatusMessage(`Snapshot created: ${res.jsonBackup.filename} & ${res.dbSnapshot.filename}`);
      await loadBackendDiagnostics();
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      alert(`Backup failed: ${err.message}`);
    } finally {
      setStorageLoading(false);
    }
  };

  const handleManualSync = async () => {
    triggerHapticFeedback();
    setStorageLoading(true);
    try {
      const synced = await syncStateToBackend(appState);
      if (synced && onStateReloaded) {
        onStateReloaded(synced);
      }
      setStatusMessage('SQLite database successfully synchronized with client state!');
      await loadBackendDiagnostics();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setStorageLoading(false);
    }
  };

  const handleRunIntegrityCheck = async () => {
    triggerHapticFeedback();
    setIntegrityLoading(true);
    try {
      const res = await checkBackendDatabaseIntegrity();
      setIntegrityStatus(res);
      setStatusMessage('PRAGMA Integrity Check complete.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(`Integrity check failed: ${err.message}`);
    } finally {
      setIntegrityLoading(false);
    }
  };

  const handleSaveCustomServerUrl = () => {
    triggerHapticFeedback();
    setCustomApiUrl(customServerUrl);
    setStatusMessage(`Backend endpoint updated to: ${customServerUrl}`);
    loadBackendDiagnostics(true);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleRotateSecret = () => {
    triggerHapticFeedback();
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    const newSecret = `kgm_sec_${hex}`;
    setApiSecretInput(newSecret);
  };

  const handleSaveSecret = () => {
    triggerHapticFeedback();
    setCustomApiSecret(apiSecretInput);
    setSecretSaved(true);
    setTimeout(() => setSecretSaved(false), 3000);
  };

  const handleCopySecret = () => {
    triggerHapticFeedback();
    navigator.clipboard.writeText(apiSecretInput);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleExecuteApiTest = async () => {
    triggerHapticFeedback();
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await executeRawEndpoint(testEndpoint, testMethod);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        ok: false,
        status: 500,
        statusText: 'Network / Client Error',
        latencyMs: 0,
        data: { error: err.message },
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleCopyTestResponse = () => {
    triggerHapticFeedback();
    if (testResult?.data) {
      navigator.clipboard.writeText(JSON.stringify(testResult.data, null, 2));
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  const filteredLogs = auditLogs.filter((l) => {
    if (!auditFilter) return true;
    const q = auditFilter.toLowerCase();
    return (
      l.action?.toLowerCase().includes(q) ||
      l.entityType?.toLowerCase().includes(q) ||
      l.entityId?.toLowerCase().includes(q) ||
      JSON.stringify(l.details || {}).toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-3 sm:p-6 pb-24 md:pb-12 max-w-5xl mx-auto space-y-6">
      {/* Top Header & Developer Sub-Navigation Bar with Clear Bottom Margin */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback();
                onBackToCompany();
              }}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition flex items-center gap-2 text-xs sm:text-sm font-bold active:scale-95 min-h-[44px] justify-center flex-shrink-0 border border-slate-700/80"
              title="Return to Company Settings"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Settings</span>
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  Developer Console
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Centralized SQLite WAL engine, API security keys, and system diagnostics for <span className="text-slate-200 font-semibold">{company.name || 'Kegama Residences'}</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${isBackendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-mono text-slate-200 font-semibold">
                {isBackendOnline ? 'SQLite WAL Online' : 'Local Storage Cache'}
              </span>
            </div>

            {onLockDeveloperMode && (
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback();
                  onLockDeveloperMode();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-bold transition active:scale-95 min-h-[40px]"
                title="Lock Developer Console and return to Settings"
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Lock Console</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Focused Developer Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-2 border-t border-slate-800 text-xs sm:text-sm">
          {[
            { id: 'backend', label: 'Database & Storage', icon: <Database className="w-4 h-4" /> },
            { id: 'mobile_security', label: 'API & Mobile Security', icon: <Key className="w-4 h-4" /> },
            { id: 'audit_logs', label: 'System Audit Logs', icon: <Activity className="w-4 h-4" /> },
            { id: 'api_tester', label: 'API Console', icon: <Server className="w-4 h-4" /> },
          ].map((tab) => {
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHapticFeedback();
                  setActiveSection(tab.id as DevSection);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition whitespace-nowrap active:scale-95 flex-shrink-0 min-h-[44px] ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* SECTION 1: Centralized Backend & Database Storage */}
      {activeSection === 'backend' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 rounded-2xl shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-2">
                <Database className="w-4 h-4 text-orange-600" />
                Central SQLite Backend & Database Storage
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Central SQLite database engine with Write-Ahead Logging (WAL mode), atomic snapshots, and data integrity verification.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunIntegrityCheck}
                disabled={integrityLoading || !isBackendOnline}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition disabled:opacity-50 min-h-[40px] border border-slate-200 dark:border-slate-700 active:scale-95"
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${integrityLoading ? 'animate-spin' : 'text-emerald-500'}`} />
                <span>Run Integrity Check</span>
              </button>

              <button
                type="button"
                onClick={() => loadBackendDiagnostics(true)}
                disabled={storageLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition min-h-[40px] border border-slate-200 dark:border-slate-700 active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${storageLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>

          {/* Database Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Database Engine Status</p>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isBackendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {isBackendOnline ? 'Online (SQLite 3 WAL)' : 'Offline (Local Cache)'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 truncate font-mono">
                {dbStats?.database?.path || 'server/data/kegama.db'}
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Storage & DB Size</p>
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                {dbStats?.database?.sizeFormatted || '4.0 KB'} (WAL Active)
              </p>
              <p className="text-[10px] text-slate-500">
                Snapshots: {backups.length} files ({dbStats?.storage?.totalBackupSizeFormatted || '0 KB'})
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Stored Central Records</p>
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                {dbStats?.database?.counts?.employees ?? appState.employees.length} Staff | {dbStats?.database?.counts?.payrollRuns ?? appState.payrollRuns.length} Cycles
              </p>
              <p className="text-[10px] text-slate-500">
                Total Payslips: {dbStats?.database?.counts?.payslips ?? appState.payrollRuns.reduce((acc, r) => acc + r.payslips.length, 0)}
              </p>
            </div>
          </div>

          {integrityStatus && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 flex items-start justify-between gap-3 text-xs animate-fade-in">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div>
                  <p className="font-bold">
                    PRAGMA integrity_check: {integrityStatus.ok ? 'Verified Healthy (OK)' : 'Integrity Issues Reported'}
                  </p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    Foreign Key Violations: {integrityStatus.foreignKeyErrors?.length || 0} &bull; Check Timestamp: {integrityStatus.checkedAt ? new Date(integrityStatus.checkedAt).toLocaleTimeString() : 'Just now'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIntegrityStatus(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCreateServerBackup}
              disabled={!isBackendOnline || storageLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-orange-600/20 transition active:scale-95 min-h-[44px]"
            >
              <HardDrive className="w-4 h-4" />
              <span>Create Server Snapshot (.db & .json)</span>
            </button>

            <button
              type="button"
              onClick={handleManualSync}
              disabled={!isBackendOnline || storageLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-xs transition active:scale-95 min-h-[44px] border border-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sync Local State with Server</span>
            </button>

            {onExportBackup && (
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback();
                  onExportBackup();
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-semibold text-xs transition active:scale-95 min-h-[44px] border border-slate-200 dark:border-slate-700"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Export Local JSON</span>
              </button>
            )}
          </div>

          {/* Existing Server Snapshots List */}
          {backups.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Available Server Backups & Snapshots ({backups.length})
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {backups.map((b) => (
                  <div key={b.filename} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileDown className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                      <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate">{b.filename}</span>
                      <span className="text-[10px] text-slate-400 font-medium">({b.sizeFormatted})</span>
                    </div>
                    <a
                      href={getBackupDownloadUrl(b.filename)}
                      download={b.filename}
                      className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline ml-3 flex-shrink-0"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Server Endpoint for Remote Hotel Deployment */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-bold whitespace-nowrap">Backend API URL:</span>
            <input
              type="text"
              placeholder="http://localhost:4000 (default) or hotel server LAN IP"
              value={customServerUrl}
              onChange={(e) => setCustomServerUrlInput(e.target.value)}
              className="flex-1 p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
            />
            <button
              type="button"
              onClick={handleSaveCustomServerUrl}
              className="px-5 py-2.5 min-h-[44px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 font-bold rounded-xl text-slate-800 dark:text-white transition active:scale-95 flex items-center justify-center"
            >
              Apply URL
            </button>
          </div>

          {/* Danger Zone: Database Reset */}
          {onResetData && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200/60 dark:border-rose-900/40">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Danger Zone: Database Reset
                </p>
                <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80">
                  Reset centralized database and local cache to clean initial hotel demo state.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback();
                  if (window.confirm('Reset both central database and local cache to clean hotel demo data?')) {
                    onResetData();
                  }
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl font-bold text-xs transition active:scale-95 min-h-[40px] border border-rose-300 dark:border-rose-800 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Database</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: Mobile App Signatures & API Security Secrets */}
      {activeSection === 'mobile_security' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 rounded-2xl shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-2">
                <Key className="w-4 h-4 text-orange-600" />
                API Security Secrets & Mobile Release Package
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Cryptographic client-server authentication tokens, Android APK certificate fingerprints, and runtime diagnostics.
              </p>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Lock className="w-3.5 h-3.5" />
              <span>Token Protected</span>
            </div>
          </div>

          {/* API Interface Secret */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs">
                Client-Server API Secret (<span className="font-mono text-[11px]">X-Kegama-API-Key</span>)
              </label>
              <button
                type="button"
                onClick={handleRotateSecret}
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Rotate Secret</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={apiSecretInput}
                  onChange={(e) => setApiSecretInput(e.target.value)}
                  className="w-full p-2.5 min-h-[44px] pr-20 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-900 dark:text-white tracking-wider focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition border border-slate-200 dark:border-slate-700 active:scale-95"
                >
                  {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSecret ? 'Copied' : 'Copy Key'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveSecret}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs transition shadow-md shadow-orange-600/20 active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply Key</span>
                </button>
              </div>
            </div>

            {secretSaved && (
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Client API Key applied! Requests authenticate with this secret.
              </p>
            )}
          </div>

          {/* Android Keystore & Cryptographic Signatures */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-orange-600" />
              <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                Mobile Release Package & Certificate Signatures
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Application Identity</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">KEGAMA Payroll</p>
                <p className="font-mono text-[11px] text-slate-500">Package ID: com.kegama.payroll</p>
                <div className="pt-1 flex items-center gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold">
                    Target SDK 34 (Android 14)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 font-semibold">
                    iOS 17+ Ready
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Android Keystore Certificate</p>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback();
                      navigator.clipboard.writeText(SHA256_FINGERPRINT);
                      setCopiedFingerprint(true);
                      setTimeout(() => setCopiedFingerprint(false), 2000);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline active:scale-95 py-0.5 px-2 rounded bg-orange-100/50 dark:bg-orange-950/50"
                  >
                    {copiedFingerprint ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedFingerprint ? 'Copied' : 'Copy SHA-256'}</span>
                  </button>
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">kegama-release.keystore (PKCS12)</p>
                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg font-mono text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 break-all leading-relaxed">
                  SHA-256: {SHA256_FINGERPRINT}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">Key Alias: kegama (Validity: 10,000 Days / Exp: 2052)</p>
              </div>
            </div>

            {/* Capacitor Native Environment Inspector */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-orange-600" />
                Capacitor Native Runtime Detection
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Platform:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{Capacitor.getPlatform()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Is Native:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{Capacitor.isNativePlatform() ? 'True' : 'False (Browser/PWA)'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Capacitor Core:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">v6.1.2</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Device Status Bar:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Integrated</span>
                </div>
              </div>
            </div>

            {/* In-App Software Updates & Self-Updater Diagnostics */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <DownloadCloud className="w-3.5 h-3.5 text-orange-600" />
                    In-App Software Updates &amp; Self-Updater Lifecycle
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Client package versioning, over-the-air (OTA) manifests, and self-updating popup test.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    Installed: v{CURRENT_APP_VERSION}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                    devManifest && devManifest.latestVersion !== CURRENT_APP_VERSION
                      ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  }`}>
                    Latest: v{devManifest?.latestVersion || CURRENT_APP_VERSION}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback();
                    loadDevVersionManifest();
                  }}
                  disabled={devVersionLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl font-bold text-xs transition active:scale-95 min-h-[40px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${devVersionLoading ? 'animate-spin' : ''}`} />
                  <span>Check Server Manifest</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback();
                    setShowDevUpdateModal(true);
                  }}
                  disabled={!devManifest}
                  className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-orange-600/20 transition active:scale-95 min-h-[40px]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Launch Self-Updating Popup</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback();
                    loadDevVersionManifest('simulate=1.0.2');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-[11px] transition active:scale-95 border border-slate-300 dark:border-slate-700 min-h-[40px]"
                  title="Simulate v1.0.2 version release"
                >
                  <span>⚡ Simulate v1.0.2</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback();
                    loadDevVersionManifest('simulate=current');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-[11px] transition active:scale-95 border border-slate-300 dark:border-slate-700 min-h-[40px]"
                  title="Reset to current installed version"
                >
                  <span>Reset to v1.0.0</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: System Audit Logs */}
      {activeSection === 'audit_logs' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 rounded-2xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-600" />
                Real-Time System Audit Logs
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Chronological ledger of database transactions, restores, backups, and security events.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadAuditLogs}
                disabled={auditLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition min-h-[40px] border border-slate-200 dark:border-slate-700 active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Logs</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback();
                  const blob = new Blob([JSON.stringify(auditLogs, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `kegama_audit_logs_${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition min-h-[40px] border border-slate-700 active:scale-95"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Search Filter Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
              placeholder="Search audit actions (e.g. CREATE_BACKUP, DATABASE_RESTORE, system)..."
              className="w-full pl-10 pr-4 py-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
            />
          </div>

          {/* Audit Logs List */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                {auditLoading ? 'Fetching system audit logs...' : 'No audit log entries matching filter.'}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400">
                        {log.action}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {log.entityType} ({log.entityId || 'N/A'})
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-xl">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>

                  <span className="font-mono text-[10px] text-slate-400 flex-shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: Interactive API & Database Endpoint Tester */}
      {activeSection === 'api_tester' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-2">
                <Server className="w-4 h-4 text-orange-600" />
                Interactive API & Endpoint Console
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Send authenticated HTTP requests directly to the centralized KEGAMA backend and inspect live JSON responses.
              </p>
            </div>
          </div>

          {/* Endpoint Selector & Method Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              value={testMethod}
              onChange={(e) => setTestMethod(e.target.value)}
              className="p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>

            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={testEndpoint}
                onChange={(e) => setTestEndpoint(e.target.value)}
                placeholder="/api/health"
                className="flex-1 p-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-hidden transition"
              />

              <button
                type="button"
                onClick={handleExecuteApiTest}
                disabled={testLoading}
                className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition shadow-md shadow-orange-600/20 active:scale-95 whitespace-nowrap"
              >
                {testLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Send Request</span>
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            <span className="text-slate-500 font-semibold">Quick Endpoints:</span>
            {[
              '/api/health',
              '/api/storage/stats',
              '/api/storage/backups',
              '/api/storage/integrity',
              '/api/reports/summary',
              '/api/reports/audit-logs?limit=10',
              '/api/state',
            ].map((ep) => (
              <button
                key={ep}
                type="button"
                onClick={() => {
                  setTestEndpoint(ep);
                  setTestMethod('GET');
                }}
                className={`px-2.5 py-1.5 min-h-[32px] rounded-lg font-mono text-[10px] transition border active:scale-95 ${
                  testEndpoint === ep
                    ? 'bg-orange-600 text-white font-bold border-orange-500 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
                }`}
              >
                {ep}
              </button>
            ))}
          </div>

          {/* Response Viewer */}
          {testResult && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                    testResult.status >= 200 && testResult.status < 300
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                  }`}>
                    {testResult.status} {testResult.statusText}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Latency: {testResult.latencyMs} ms
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyTestResponse}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition"
                >
                  {copiedResponse ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedResponse ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>

              <div className="bg-slate-950 rounded-xl p-3 max-h-80 overflow-y-auto font-mono text-xs text-slate-200 border border-slate-800">
                <pre className="whitespace-pre-wrap">{JSON.stringify(testResult.data, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Developer In-App Self-Updater Preview Modal */}
      {showDevUpdateModal && devManifest && (
        <AppUpdateModal
          manifest={devManifest}
          isOpen={showDevUpdateModal}
          onClose={() => setShowDevUpdateModal(false)}
        />
      )}
    </div>
  );
};
