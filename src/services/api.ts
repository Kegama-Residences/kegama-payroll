import { AppState, CompanyProfile, Employee, PayrollRun, PayslipItem, PayrollStatus } from '../types/payroll';
import { Capacitor } from '@capacitor/core';

const STORAGE_CUSTOM_URL_KEY = 'kegama_backend_url';
const STORAGE_CUSTOM_SECRET_KEY = 'kegama_api_secret';
export const DEFAULT_API_SECRET = 'kgm_sec_d7dc82afb7e66347fa4a5b5fb9e20fe68f2a81ffd65a0131';

export function getApiBaseUrl(): string {
  const custom = localStorage.getItem(STORAGE_CUSTOM_URL_KEY);
  if (custom) return custom.replace(/\/+$/, '');

  if (Capacitor.isNativePlatform()) {
    return 'http://10.0.2.2:4000';
  }
  return '';
}

export function setCustomApiUrl(url: string): void {
  if (!url) {
    localStorage.removeItem(STORAGE_CUSTOM_URL_KEY);
  } else {
    localStorage.setItem(STORAGE_CUSTOM_URL_KEY, url.trim().replace(/\/+$/, ''));
  }
}

export function getApiSecret(): string {
  const stored = localStorage.getItem(STORAGE_CUSTOM_SECRET_KEY);
  if (stored) return stored.trim();
  return (import.meta as any).env?.VITE_API_SECRET || DEFAULT_API_SECRET;
}

export function setCustomApiSecret(secret: string): void {
  if (!secret) {
    localStorage.removeItem(STORAGE_CUSTOM_SECRET_KEY);
  } else {
    localStorage.setItem(STORAGE_CUSTOM_SECRET_KEY, secret.trim());
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const fullUrl = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Kegama-API-Key': getApiSecret(),
    ...(options.headers as Record<string, string> || {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || `HTTP error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// In-memory cache & concurrent request deduplication for health checks to prevent lag & RAM bloat
let healthCache: { isOnline: boolean; details?: any; timestamp: number } | null = null;
let activeHealthPromise: Promise<{ isOnline: boolean; details?: any }> | null = null;
const HEALTH_CACHE_TTL_MS = 8000; // 8 seconds cache

export function clearClientHealthCache(): void {
  healthCache = null;
}

// 1. Health & Connection Status
export async function checkBackendHealth(options?: {
  forceRefresh?: boolean;
  quick?: boolean;
}): Promise<{ isOnline: boolean; details?: any }> {
  const now = Date.now();

  // Return cached result if still within TTL and forceRefresh was not requested
  if (!options?.forceRefresh && healthCache && now - healthCache.timestamp < HEALTH_CACHE_TTL_MS) {
    return { isOnline: healthCache.isOnline, details: healthCache.details };
  }

  // Deduplicate concurrent in-flight requests
  if (activeHealthPromise) {
    return activeHealthPromise;
  }

  activeHealthPromise = (async () => {
    try {
      const endpoint = options?.quick ? '/api/health?quick=true' : '/api/health';
      const data = await request<any>(endpoint);
      const result = { isOnline: data.status === 'ok', details: data };
      healthCache = { ...result, timestamp: Date.now() };
      return result;
    } catch {
      const result = { isOnline: false };
      healthCache = { ...result, timestamp: Date.now() };
      return result;
    } finally {
      activeHealthPromise = null;
    }
  })();

  return activeHealthPromise;
}


// 2. Fetch Full State (Central Database)
export async function fetchStateFromBackend(): Promise<AppState | null> {
  try {
    const res = await request<{ success: boolean; data: AppState }>('/api/state');
    return res.data;
  } catch (err) {
    console.warn('[API] Could not fetch state from backend:', err);
    return null;
  }
}

// 3. Sync State to Backend
export async function syncStateToBackend(state: AppState): Promise<AppState | null> {
  try {
    const res = await request<{ success: boolean; data: AppState }>('/api/state/sync', {
      method: 'POST',
      body: JSON.stringify(state),
    });
    return res.data;
  } catch (err) {
    console.warn('[API] State sync to backend failed:', err);
    return null;
  }
}

// 4. Company Profile
export async function updateBackendCompany(company: CompanyProfile): Promise<CompanyProfile | null> {
  try {
    const res = await request<{ success: boolean; data: CompanyProfile }>('/api/company', {
      method: 'PUT',
      body: JSON.stringify(company),
    });
    return res.data;
  } catch (err) {
    console.warn('[API] Failed to update company:', err);
    return null;
  }
}

// 5. Employees CRUD
export async function saveBackendEmployee(emp: Employee, isNew: boolean): Promise<Employee | null> {
  try {
    const method = isNew ? 'POST' : 'PUT';
    const endpoint = isNew ? '/api/employees' : `/api/employees/${emp.id}`;
    const res = await request<{ success: boolean; data: Employee }>(endpoint, {
      method,
      body: JSON.stringify(emp),
    });
    return res.data;
  } catch (err) {
    console.warn('[API] Failed to save employee:', err);
    return null;
  }
}

export async function deleteBackendEmployee(id: string): Promise<boolean> {
  try {
    await request(`/api/employees/${id}`, { method: 'DELETE' });
    return true;
  } catch (err) {
    console.warn('[API] Failed to delete employee:', err);
    return false;
  }
}

export async function toggleBackendEmployeeStatus(id: string): Promise<Employee | null> {
  try {
    const res = await request<{ success: boolean; data: Employee }>(`/api/employees/${id}/toggle-status`, {
      method: 'PATCH',
    });
    return res.data;
  } catch (err) {
    console.warn('[API] Failed to toggle employee status:', err);
    return null;
  }
}

// 6. Payroll Runs CRUD
export async function createBackendPayrollRun(run: PayrollRun): Promise<PayrollRun | null> {
  try {
    const res = await request<{ success: boolean; data: PayrollRun }>('/api/payroll/runs', {
      method: 'POST',
      body: JSON.stringify(run),
    });
    return res.data;
  } catch (err) {
    console.warn('[API] Failed to create payroll run:', err);
    return null;
  }
}

export async function updateBackendPayrollStatus(runId: string, status: PayrollStatus): Promise<PayrollRun | null> {
  try {
    const res = await request<{ success: boolean; data: PayrollRun }>(`/api/payroll/runs/${runId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return res.data;
  } catch (err) {
    console.warn('[API] Failed to update payroll run status:', err);
    return null;
  }
}

export async function deleteBackendPayrollRun(runId: string): Promise<boolean> {
  try {
    await request(`/api/payroll/runs/${runId}`, { method: 'DELETE' });
    return true;
  } catch (err) {
    console.warn('[API] Failed to delete payroll run:', err);
    return false;
  }
}

export async function updateBackendPayslip(runId: string, payslip: PayslipItem): Promise<PayrollRun | null> {
  try {
    const res = await request<{ success: boolean; data: PayrollRun }>(`/api/payroll/runs/${runId}/payslips/${payslip.id}`, {
      method: 'PUT',
      body: JSON.stringify(payslip),
    });
    return res.data;
  } catch (err) {
    console.warn('[API] Failed to update payslip:', err);
    return null;
  }
}

// 7. Storage & Backup Operations
export async function fetchBackendStorageStats(): Promise<any> {
  try {
    const res = await request<{ success: boolean; data: any }>('/api/storage/stats');
    return res.data;
  } catch (err) {
    console.warn('[API] Failed to fetch storage stats:', err);
    return null;
  }
}

export async function fetchBackendBackups(): Promise<any[]> {
  try {
    const res = await request<{ success: boolean; data: any[] }>('/api/storage/backups');
    return res.data || [];
  } catch (err) {
    console.warn('[API] Failed to fetch backups:', err);
    return [];
  }
}

export async function createBackendBackupSnapshot(): Promise<any> {
  try {
    const res = await request<{ success: boolean; data: any; message: string }>('/api/storage/backup', {
      method: 'POST',
    });
    return res.data;
  } catch (err) {
    console.warn('[API] Failed to create backup snapshot:', err);
    throw err;
  }
}

export function getBackupDownloadUrl(filename: string): string {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/api/storage/backup/${encodeURIComponent(filename)}`;
}

export async function restoreBackendDatabase(state: AppState): Promise<AppState | null> {
  try {
    const res = await request<{ success: boolean; data: AppState; message: string }>('/api/storage/restore', {
      method: 'POST',
      body: JSON.stringify(state),
    });
    return res.data;
  } catch (err) {
    console.warn('[API] Failed to restore database:', err);
    throw err;
  }
}

export async function resetBackendDatabase(): Promise<AppState | null> {
  try {
    const res = await request<{ success: boolean; data: AppState; message: string }>('/api/storage/reset', {
      method: 'POST',
    });
    return res.data;
  } catch (err) {
    console.warn('[API] Failed to reset database:', err);
    throw err;
  }
}

// 8. Database Integrity Check
export async function checkBackendDatabaseIntegrity(): Promise<{
  ok: boolean;
  integrity: any[];
  foreignKeyErrors: any[];
  checkedAt: string;
} | null> {
  try {
    const res = await request<{ success: boolean; data: any }>('/api/storage/integrity');
    return res.data;
  } catch (err) {
    console.warn('[API] Failed to check database integrity:', err);
    return null;
  }
}

// 9. Fetch Audit Logs
export async function fetchBackendAuditLogs(limit: number = 50): Promise<any[]> {
  try {
    const res = await request<{ success: boolean; data: any[] }>(`/api/reports/audit-logs?limit=${limit}`);
    return res.data || [];
  } catch (err) {
    console.warn('[API] Failed to fetch audit logs:', err);
    return [];
  }
}

// 10. Raw Endpoint Tester for Developer Console
export async function executeRawEndpoint(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<{ status: number; statusText: string; latencyMs: number; data: any }> {
  const baseUrl = getApiBaseUrl();
  const fullUrl = `${baseUrl}${endpoint}`;
  const start = performance.now();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Kegama-API-Key': getApiSecret(),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - start);

    let parsed: any;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      parsed = await res.json().catch(() => ({}));
    } else {
      parsed = await res.text().catch(() => '');
    }

    return {
      status: res.status,
      statusText: res.statusText || (res.ok ? 'OK' : 'Error'),
      latencyMs,
      data: parsed,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - start);
    return {
      status: 0,
      statusText: err.name === 'AbortError' ? 'Timeout' : 'Network Error',
      latencyMs,
      data: { error: err.message || 'Connection failed' },
    };
  }
}

