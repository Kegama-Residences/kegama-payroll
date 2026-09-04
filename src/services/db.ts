import Dexie, { type Table } from 'dexie';
import type { Employee, AttendanceLog, PayrollCutoff } from '../types';

export interface SyncQueueItem {
  id: string;
  logId: string;
  payload: AttendanceLog;
  createdAt: string;
  status: 'pending' | 'synced' | 'failed';
  errorMessage?: string;
}

export class KegamaDatabase extends Dexie {
  employees!: Table<Employee, string>;
  attendanceLogs!: Table<AttendanceLog, string>;
  payrollCutoffs!: Table<PayrollCutoff, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super('KegamaDB');
    this.version(1).stores({
      employees: 'id, fullName, jobTitle, department, shiftType, status',
      attendanceLogs: 'id, employeeId, logType, timestamp, manualOverride, synced',
      payrollCutoffs: 'id, startDate, endDate, status',
      syncQueue: 'id, logId, status, createdAt',
    });
  }
}

export const db = new KegamaDatabase();

// Initial Seed Data
export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'KR-001',
    fullName: 'Maria Santos',
    jobTitle: 'Operations Supervisor',
    department: 'Operations',
    dailyRate: 850,
    monthlyBasicRate: 22100,
    sssShare: 950,
    philHealthShare: 450,
    pagIbigShare: 200,
    shiftType: 'regular',
    shiftStart: '08:00',
    shiftEnd: '17:00',
    loanBalance: 1500,
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'KR-002',
    fullName: 'Juan dela Cruz',
    jobTitle: 'Senior Maintenance Tech',
    department: 'Maintenance',
    dailyRate: 780,
    monthlyBasicRate: 20280,
    sssShare: 900,
    philHealthShare: 420,
    pagIbigShare: 200,
    shiftType: 'night',
    shiftStart: '22:00',
    shiftEnd: '06:00',
    loanBalance: 0,
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'KR-003',
    fullName: 'Carlos Reyes',
    jobTitle: 'Security Officer',
    department: 'Security',
    dailyRate: 720,
    monthlyBasicRate: 18720,
    sssShare: 800,
    philHealthShare: 400,
    pagIbigShare: 200,
    shiftType: 'night',
    shiftStart: '22:00',
    shiftEnd: '06:00',
    loanBalance: 500,
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    createdAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 'KR-004',
    fullName: 'Ana Patricia Gomez',
    jobTitle: 'Inventory Specialist',
    department: 'Warehouse',
    dailyRate: 680,
    monthlyBasicRate: 17680,
    sssShare: 750,
    philHealthShare: 380,
    pagIbigShare: 200,
    shiftType: 'regular',
    shiftStart: '08:00',
    shiftEnd: '17:00',
    loanBalance: 0,
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    createdAt: '2026-02-15T08:00:00Z',
  },
  {
    id: 'KR-005',
    fullName: 'Mark Kevin Bautista',
    jobTitle: 'Logistics Associate',
    department: 'Logistics',
    dailyRate: 640,
    monthlyBasicRate: 16640,
    sssShare: 720,
    philHealthShare: 360,
    pagIbigShare: 200,
    shiftType: 'regular',
    shiftStart: '08:00',
    shiftEnd: '17:00',
    loanBalance: 2000,
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    createdAt: '2026-03-01T08:00:00Z',
  },
];

// Initial Seed Logs demonstrating regular shifts, night shift midnight crossovers, and edge case missed punches
export const INITIAL_ATTENDANCE_LOGS: AttendanceLog[] = [
  // KR-001 (Maria Santos) - Regular shift 08:00 - 17:00
  {
    id: 'LOG-001',
    employeeId: 'KR-001',
    logType: 'TIME_IN',
    timestamp: '2026-09-01T07:55:12Z',
    manualOverride: false,
    synced: true,
    deviceId: 'KIOSK-MAIN-01',
  },
  {
    id: 'LOG-002',
    employeeId: 'KR-001',
    logType: 'TIME_OUT',
    timestamp: '2026-09-01T17:05:40Z',
    manualOverride: false,
    synced: true,
    deviceId: 'KIOSK-MAIN-01',
  },
  {
    id: 'LOG-003',
    employeeId: 'KR-001',
    logType: 'TIME_IN',
    timestamp: '2026-09-02T08:14:22Z', // 14 mins late
    manualOverride: false,
    synced: true,
    deviceId: 'KIOSK-MAIN-01',
  },
  {
    id: 'LOG-004',
    employeeId: 'KR-001',
    logType: 'TIME_OUT',
    timestamp: '2026-09-02T17:02:18Z',
    manualOverride: false,
    synced: true,
    deviceId: 'KIOSK-MAIN-01',
  },

  // KR-002 (Juan dela Cruz) - Night Shift (22:00 - 06:00) with MIDNIGHT CROSSOVER!
  // Shift 1: In on 2026-09-01 21:55, Out on 2026-09-02 06:05 (next morning!)
  {
    id: 'LOG-005',
    employeeId: 'KR-002',
    logType: 'TIME_IN',
    timestamp: '2026-09-01T21:55:00Z',
    manualOverride: false,
    synced: true,
    deviceId: 'KIOSK-MAIN-01',
  },
  {
    id: 'LOG-006',
    employeeId: 'KR-002',
    logType: 'TIME_OUT',
    timestamp: '2026-09-02T06:05:30Z',
    manualOverride: false,
    synced: true,
    deviceId: 'KIOSK-MAIN-01',
  },
  // Shift 2: In on 2026-09-02 22:03, Out on 2026-09-03 06:01
  {
    id: 'LOG-007',
    employeeId: 'KR-002',
    logType: 'TIME_IN',
    timestamp: '2026-09-02T22:03:15Z',
    manualOverride: false,
    synced: true,
    deviceId: 'KIOSK-MAIN-01',
  },
  {
    id: 'LOG-008',
    employeeId: 'KR-002',
    logType: 'TIME_OUT',
    timestamp: '2026-09-03T06:01:45Z',
    manualOverride: false,
    synced: true,
    deviceId: 'KIOSK-MAIN-01',
  },

  // KR-003 (Carlos Reyes) - Night shift with a MISSED PUNCH!
  // Clocks in on Sept 02 at 22:15, but forgets to clock out on Sept 03 morning!
  {
    id: 'LOG-009',
    employeeId: 'KR-003',
    logType: 'TIME_IN',
    timestamp: '2026-09-02T22:15:00Z',
    manualOverride: false,
    synced: true,
    deviceId: 'KIOSK-MAIN-01',
  },
  // Missing punch here for KR-003!

  // KR-004 (Ana Gomez) - Missed punch: orphan TIME_OUT without prior TIME_IN
  {
    id: 'LOG-010',
    employeeId: 'KR-004',
    logType: 'TIME_OUT',
    timestamp: '2026-09-02T17:10:00Z',
    manualOverride: false,
    synced: true,
    deviceId: 'KIOSK-MAIN-01',
  },

  // KR-005 (Mark Kevin Bautista) - Manual Override punch example
  {
    id: 'LOG-011',
    employeeId: 'KR-005',
    logType: 'TIME_IN',
    timestamp: '2026-09-01T08:00:00Z',
    manualOverride: true,
    supervisorNote: 'Supervisor approved manual punch: badge forgotten at gate',
    synced: true,
    deviceId: 'ADMIN-PORTAL',
  },
  {
    id: 'LOG-012',
    employeeId: 'KR-005',
    logType: 'TIME_OUT',
    timestamp: '2026-09-01T17:00:00Z',
    manualOverride: true,
    supervisorNote: 'Supervisor approved manual punch',
    synced: true,
    deviceId: 'ADMIN-PORTAL',
  },
];

export async function seedDatabaseIfEmpty() {
  const count = await db.employees.count();
  if (count === 0) {
    await db.employees.bulkAdd(INITIAL_EMPLOYEES);
    await db.attendanceLogs.bulkAdd(INITIAL_ATTENDANCE_LOGS);
    console.log('[KegamaDB] Initial seed data loaded successfully.');
  }
}
