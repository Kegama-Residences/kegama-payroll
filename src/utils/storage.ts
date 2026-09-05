import { AppState } from '../types/payroll';
import { SAMPLE_COMPANY } from './sampleData';
import { Preferences } from '@capacitor/preferences';
import { fetchStateFromBackend, syncStateToBackend, resetBackendDatabase } from '../services/api';

const STORAGE_KEY = 'kegama_payroll_ph_v3';

function migrateState(state: AppState): AppState {
  if (state?.company) {
    state.company.name = 'Kegama Residences, Inc.';
    state.company.tradingName = '';
    state.company.authorizedSignatoryTitle = 'Director of Human Resources & Hospitality Operations';
    state.company.payslipFooterText = 'Confidential document issued pursuant to DOLE Labor Code Article 103 and BIR Withholding Regulations.';
  }
  // Remove legacy mockup employees (emp-101 to emp-106) and runs
  if (state?.employees && state.employees.some(e => e.id.startsWith('emp-10') || e.employeeNumber.includes('0101'))) {
    state.employees = [];
    state.payrollRuns = [];
    state.activePayrollRunId = undefined;
  }
  if (!state.employees) state.employees = [];
  if (!state.payrollRuns) state.payrollRuns = [];
  return state;
}

export async function loadInitialState(): Promise<AppState> {
  // 1. Try to load directly from centralized SQLite Backend
  try {
    const backendState = await fetchStateFromBackend();
    if (backendState && backendState.company) {
      const migrated = migrateState(backendState);
      await saveStateLocally(migrated);
      return migrated;
    }
  } catch (err) {
    console.warn('[Storage] Backend not reachable on load, falling back to local cache:', err);
  }

  // 2. Fallback to Capacitor Preferences / LocalStorage
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      const parsed = JSON.parse(value);
      return migrateState(parsed);
    }
  } catch {
    const localVal = localStorage.getItem(STORAGE_KEY);
    if (localVal) {
      try {
        const parsed = JSON.parse(localVal);
        return migrateState(parsed);
      } catch (e) {
        console.error('Error parsing localStorage state:', e);
      }
    }
  }

  // 3. Clean initial state without mock data
  const initialState: AppState = {
    company: SAMPLE_COMPANY,
    employees: [],
    payrollRuns: [],
    activePayrollRunId: undefined,
  };

  await saveState(initialState);
  return initialState;
}

export async function saveStateLocally(state: AppState): Promise<void> {
  const serialized = JSON.stringify(state);
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('LocalStorage save failed:', err);
  }

  try {
    await Preferences.set({
      key: STORAGE_KEY,
      value: serialized,
    });
  } catch (err) {
    console.warn('Capacitor Preferences save failed:', err);
  }
}

export async function saveState(state: AppState): Promise<void> {
  await saveStateLocally(state);

  // Background asynchronous sync to centralized SQLite Backend
  syncStateToBackend(state).catch((err) => {
    console.warn('[Storage] Background backend sync skipped or offline:', err.message);
  });
}

export async function resetToDefaultData(): Promise<AppState> {
  try {
    const res = await resetBackendDatabase();
    if (res) {
      res.employees = [];
      res.payrollRuns = [];
      res.activePayrollRunId = undefined;
      await saveStateLocally(res);
      return res;
    }
  } catch (e) {
    console.warn('[Storage] Backend reset unavailable, resetting local state:', e);
  }

  const cleanState: AppState = {
    company: SAMPLE_COMPANY,
    employees: [],
    payrollRuns: [],
    activePayrollRunId: undefined,
  };
  await saveState(cleanState);
  return cleanState;
}

export function exportDataAsJSON(state: AppState): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `kegama_payroll_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
