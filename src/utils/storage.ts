import { AppState } from '../types/payroll';
import { SAMPLE_COMPANY } from './sampleData';
import { deriveRates, DEFAULT_WORK_SCHEDULE } from './calculations';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const STORAGE_KEY = 'kegama_payroll_local_v1';
const LEGACY_KEYS = ['kegama_payroll_ph_v4', 'kegama_payroll_ph_v3'];

/**
 * Specific seed-employee IDs that were shipped in old builds and should be
 * dropped on first load. These are intentionally exact strings — NOT prefix
 * matches — to avoid accidentally removing real user-created employees (#4).
 */
const SEED_EMPLOYEE_IDS = new Set([
  'emp-101', 'emp-102', 'emp-103', 'emp-104', 'emp-105', 'emp-106',
]);

/** Pure migration: never mutates input. */
export function migrateState(input: AppState): AppState {
  const rawAttendance = (input as Partial<AppState>)?.attendance;
  const state: AppState = {
    company: { ...input?.company } as AppState['company'],
    employees: Array.isArray(input?.employees) ? [...input.employees] : [],
    payrollRuns: Array.isArray(input?.payrollRuns) ? [...input.payrollRuns] : [],
    activePayrollRunId: input?.activePayrollRunId,
    attendance: rawAttendance && typeof rawAttendance === 'object' ? { ...rawAttendance } : {},
  };
  if (!state.company || typeof state.company !== 'object') {
    state.company = { ...SAMPLE_COMPANY };
  }
  // Drop legacy seed employees by exact ID only — never by prefix — to avoid
  // touching real employee records (#4).
  state.employees = state.employees.filter((e) => !SEED_EMPLOYEE_IDS.has(e.id));

  // Assign the default 6-day/Sunday-rest schedule to employees saved before
  // schedules existed, and re-derive daily/hourly rates with each employee's
  // factor (261 for 5-day, 313 for 6-day, 393 for 7-day). Rates are always derived, never
  // user-edited, so recomputing from monthlyRate is safe.
  state.employees = state.employees.map((e) => {
    const workSchedule = { ...DEFAULT_WORK_SCHEDULE, ...(e.workSchedule ?? {}) };
    const { dailyRate, hourlyRate } = deriveRates(e.monthlyRate, workSchedule);
    if (
      e.workSchedule !== undefined &&
      e.workSchedule.hoursPerDay === workSchedule.hoursPerDay &&
      e.dailyRate === dailyRate &&
      e.hourlyRate === hourlyRate
    )
      return e;
    return { ...e, workSchedule, dailyRate, hourlyRate };
  });
  return state;
}

/**
 * Validate top-level AppState shape plus critical field types (#23).
 * Rejects obviously corrupt backups before they can be persisted.
 */
function isValidAppState(v: unknown): v is AppState {
  if (!v || typeof v !== 'object') return false;
  const s = v as AppState;
  if (!s.company || typeof s.company.name !== 'string' || !s.company.name.trim()) return false;
  if (!Array.isArray(s.employees) || !Array.isArray(s.payrollRuns)) return false;
  // Validate every employee has at minimum an id, a name, and a numeric salary.
  for (const emp of s.employees) {
    if (!emp || typeof emp.id !== 'string' || !emp.id.trim()) return false;
    if (typeof emp.monthlyRate !== 'number' || !Number.isFinite(emp.monthlyRate)) return false;
    if (typeof emp.firstName !== 'string') return false;
  }
  // Validate every run has an id and a payslips array.
  for (const run of s.payrollRuns) {
    if (!run || typeof run.id !== 'string' || !run.id.trim()) return false;
    if (!Array.isArray(run.payslips)) return false;
  }
  return true;
}

async function readLegacyLocal(): Promise<AppState | null> {
  for (const key of LEGACY_KEYS) {
    try {
      const v = localStorage.getItem(key);
      if (v) {
        const parsed = JSON.parse(v) as AppState;
        if (isValidAppState(parsed)) {
          const migrated = migrateState(parsed);
          await saveState(migrated);
          localStorage.removeItem(key);
          return migrated;
        }
      }
    } catch {
      /* ignore corrupt legacy */
    }
  }
  return null;
}

export async function loadInitialState(): Promise<AppState> {
  // 1. Capacitor Preferences
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      try {
        const parsed = JSON.parse(value) as AppState;
        if (isValidAppState(parsed)) return migrateState(parsed);
      } catch (e) {
        console.error('Error parsing Preferences state:', e);
      }
    }
  } catch {
    /* fall through to localStorage */
  }

  // 2. localStorage (web fallback)
  try {
    const localVal = localStorage.getItem(STORAGE_KEY);
    if (localVal) {
      const parsed = JSON.parse(localVal) as AppState;
      if (isValidAppState(parsed)) return migrateState(parsed);
    }
  } catch (e) {
    console.error('Error parsing localStorage state:', e);
  }

  // 3. One-time legacy import (v3/v4 keys from backend era)
  const legacy = await readLegacyLocal();
  if (legacy) return legacy;

  // 4. Clean initial state
  const initialState: AppState = {
    company: SAMPLE_COMPANY,
    employees: [],
    payrollRuns: [],
    activePayrollRunId: undefined,
    attendance: {},
  };
  await saveState(initialState);
  return initialState;
}

export async function saveState(state: AppState): Promise<void> {
  let serialized: string;
  try {
    serialized = JSON.stringify(state);
  } catch (err) {
    console.warn('State serialization failed:', err);
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('LocalStorage save failed:', err);
  }
  try {
    await Preferences.set({ key: STORAGE_KEY, value: serialized });
  } catch (err) {
    console.warn('Capacitor Preferences save failed:', err);
  }
}

export async function resetToDefaultData(): Promise<AppState> {
  const cleanState: AppState = {
    company: SAMPLE_COMPANY,
    employees: [],
    payrollRuns: [],
    activePayrollRunId: undefined,
    attendance: {},
  };
  await saveState(cleanState);
  return cleanState;
}

/** Validate + import a JSON backup file. Throws on invalid data. */
export async function importDataFromJSON(json: string): Promise<AppState> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid backup file: not valid JSON.');
  }
  if (!isValidAppState(parsed)) {
    throw new Error('Invalid backup file: missing or malformed company, employees, or payroll runs.');
  }
  const migrated = migrateState(parsed);
  await saveState(migrated);
  return migrated;
}

export async function exportDataAsJSON(state: AppState): Promise<void> {
  const jsonStr = JSON.stringify(state, null, 2);
  const fileName = `kegama_payroll_${new Date().toISOString().slice(0, 10)}.json`;

  if (Capacitor.isNativePlatform()) {
    try {
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: jsonStr,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({
        title: 'Kegama Payroll Backup',
        text: `Kegama Payroll Backup (${fileName})`,
        url: writeResult.uri,
        dialogTitle: 'Export or Share Backup',
      });
      return;
    } catch (err) {
      console.warn('Native export failed, falling back to browser download:', err);
    }
  }

  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  // Use try/finally so the URL is always revoked even if click() throws (#22).
  try {
    a.click();
  } finally {
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
