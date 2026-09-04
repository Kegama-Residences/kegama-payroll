export type ShiftType = 'regular' | 'night' | 'flexible';

export interface Employee {
  id: string; // e.g., 'KR-001'
  fullName: string;
  jobTitle: string;
  department: string;
  dailyRate: number;
  monthlyBasicRate: number;
  sssShare: number; // monthly statutory share
  philHealthShare: number; // monthly statutory share
  pagIbigShare: number; // monthly statutory share
  shiftType: ShiftType;
  shiftStart: string; // e.g. "08:00" or "22:00"
  shiftEnd: string; // e.g. "17:00" or "06:00"
  avatarUrl?: string;
  loanBalance: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export type LogType = 'TIME_IN' | 'TIME_OUT';

export interface AttendanceLog {
  id: string; // Auto-ID
  employeeId: string;
  logType: LogType;
  timestamp: string; // ISO string
  manualOverride: boolean;
  supervisorNote?: string;
  synced: boolean;
  deviceId: string;
}

export interface PairedShift {
  id: string;
  employeeId: string;
  shiftDate: string; // Date identifier YYYY-MM-DD
  timeInLog?: AttendanceLog;
  timeOutLog?: AttendanceLog;
  hoursWorked: number;
  lateMinutes: number;
  undertimeMinutes: number;
  overtimeHours: number;
  status: 'complete' | 'missing_out' | 'missing_in' | 'manual_adjusted';
  isMidnightCrossover: boolean;
}

export interface CutoffSummaryItem {
  employeeId: string;
  fullName: string;
  jobTitle: string;
  department: string;
  dailyRate: number;
  monthlyBasicRate: number;
  totalDaysRendered: number;
  totalHoursWorked: number;
  totalLateMinutes: number;
  totalUndertimeMinutes: number;
  lateDeduction: number;
  grossEarnings: number;
  sssDeduction: number; // half of monthly share
  philHealthDeduction: number; // half of monthly share
  pagIbigDeduction: number; // half of monthly share
  loanDeduction: number;
  totalDeductions: number;
  netPay: number;
  unpairedPunchesCount: number;
  pairedShifts: PairedShift[];
}

export interface PayrollCutoff {
  id: string;
  cutoffName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: 'draft' | 'compiled' | 'approved';
  compiledAt: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  items: CutoffSummaryItem[];
}

export interface QrPayload {
  empId: string;
  code: string;
  timestamp: number;
  checksum: string;
}
