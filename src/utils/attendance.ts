import { DayRecord, Employee, WorkSchedule } from '../types/payroll';
import { fullDayMinutesFor, halfDayMinutesFor, isScheduledWorkDay, toISODateLocal } from './calculations';
import { round2 } from './statutoryTables';

export type AttendanceMap = Record<string, Record<string, DayRecord>>;

/** Defaults for an 8h shift. Per-employee values come from fullDayMinutesFor / halfDayMinutesFor. */
export const FULL_DAY_MINUTES = 8 * 60;
export const HALF_DAY_MINUTES = 4 * 60;
/** Regular-holiday premium applied on top for a worked holiday (matches the 200% payslip label). */
export const HOLIDAY_RATE_MULTIPLIER = 2;

export function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Mondays-first week grid for a month: rows of 7 cells (null = padding). */
export function buildMonthGrid(year: number, month0: number): (Date | null)[][] {
  const first = new Date(year, month0, 1);
  // Monday-start offset: Mon=0 … Sun=6
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month0, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function monthLabel(year: number, month0: number): string {
  return new Date(year, month0, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
}

export const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function restDayName(schedule?: WorkSchedule): string | null {
  if (schedule?.daysPerWeek === 7) return null;
  const r = schedule?.restDay;
  return r !== undefined && r >= 0 && r <= 6 ? DAY_NAMES[r] : DAY_NAMES[0];
}

export function getDayRecord(map: AttendanceMap, employeeId: string, iso: string): DayRecord | undefined {
  return map[employeeId]?.[iso];
}

/** Pure update: set (or clear with undefined) one marked day. */
export function setDayRecord(
  map: AttendanceMap,
  employeeId: string,
  iso: string,
  rec: DayRecord | undefined,
): AttendanceMap {
  const emp = { ...(map[employeeId] ?? {}) };
  if (rec === undefined) {
    delete emp[iso];
  } else {
    emp[iso] = rec;
  }
  const next = { ...map };
  if (Object.keys(emp).length === 0) {
    delete next[employeeId];
  } else {
    next[employeeId] = emp;
  }
  return next;
}

export interface PeriodSummary {
  scheduledDays: number;
  /** Actual paid-equivalent days: scheduled − absent − half×0.5 (leave counts paid). */
  daysWorked: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  holidayDays: number;
  /** OT hours worked on regular scheduled work days (DOLE 125% rate). */
  overtimeHours: number;
  /** OT hours worked on rest days / Sundays (DOLE 130% rate). */
  restDayOvertimeHours: number;
  nightDiffHours: number;
  tardinessMinutes: number;
  /** Absences converted to unpaid minutes (full shift, half = half shift). */
  undertimeMinutes: number;
  holidayPay: number;
  hasMarks: boolean;
}

/**
 * Summarize one employee's calendar over [periodStart, periodEnd].
 * Rules: unmarked work day = present. Absent docks a full shift via undertime
 * minutes; half-day docks half a shift. Legacy 'leave'/'holiday' marks from old data
 * still count (leave paid, holiday paid 200%) but the UI no longer creates them.
 * Marks on rest days (e.g. Sundays) count OT / night-diff / tardiness so
 * Sunday work can be paid — they don't change scheduled/absent counts.
 * Rest-day OT is tracked separately so the DOLE 130% rate is applied (#3).
 */
export function summarizePeriod(
  employee: Employee,
  map: AttendanceMap,
  periodStart: string,
  periodEnd: string,
): PeriodSummary {
  const empty: PeriodSummary = {
    scheduledDays: 0,
    daysWorked: 0,
    absentDays: 0,
    halfDays: 0,
    leaveDays: 0,
    holidayDays: 0,
    overtimeHours: 0,
    restDayOvertimeHours: 0,
    nightDiffHours: 0,
    tardinessMinutes: 0,
    undertimeMinutes: 0,
    holidayPay: 0,
    hasMarks: false,
  };
  const s = parseISODate(periodStart);
  const e = parseISODate(periodEnd);
  if (!s || !e || e < s) return empty;

  const empMarks = map[employee.id] ?? {};
  const out: PeriodSummary = { ...empty };
  const fullMins = fullDayMinutesFor(employee.workSchedule);
  const halfMins = halfDayMinutesFor(employee.workSchedule);
  const cur = new Date(s);
  // A payroll period should never exceed ~62 calendar days (#17).
  let guard = 0;
  while (cur <= e && guard < 62) {
    const iso = toISODateLocal(cur);
    const mark = empMarks[iso];
    if (!isScheduledWorkDay(iso, employee.workSchedule)) {
      // Rest day (often Sunday): allow optional rest-day work — OT hours go
      // into restDayOvertimeHours so the 130% DOLE rate applies downstream.
      if (mark) {
        out.hasMarks = true;
        out.restDayOvertimeHours = round2(
          out.restDayOvertimeHours + Math.max(0, mark.overtimeHours ?? 0),
        );
        out.nightDiffHours = round2(out.nightDiffHours + Math.max(0, mark.nightDiffHours ?? 0));
        out.tardinessMinutes += Math.max(0, Math.floor(mark.tardinessMinutes ?? 0));
        // Keep legacy counters accurate even if a rest-day holds an old mark.
        if (mark.status === 'leave') out.leaveDays += 1;
        if (mark.status === 'holiday') out.holidayDays += 1;
      }
      cur.setDate(cur.getDate() + 1);
      guard += 1;
      continue;
    }
    {
      out.scheduledDays += 1;
      const workMark = mark;
      if (workMark) {
        out.hasMarks = true;
        out.overtimeHours = round2(out.overtimeHours + Math.max(0, workMark.overtimeHours ?? 0));
        out.nightDiffHours = round2(out.nightDiffHours + Math.max(0, workMark.nightDiffHours ?? 0));
        out.tardinessMinutes += Math.max(0, Math.floor(workMark.tardinessMinutes ?? 0));
        switch (workMark.status) {
          case 'present':
            // Explicitly present (e.g. carrying OT hours) — paid, nothing docked.
            break;
          case 'absent':
            out.absentDays += 1;
            out.undertimeMinutes += fullMins;
            break;
          case 'half-day':
            out.halfDays += 1;
            out.undertimeMinutes += halfMins;
            break;
          case 'leave':
            out.leaveDays += 1;
            break;
          case 'holiday':
            out.holidayDays += 1;
            break;
        }
      }
    }
    cur.setDate(cur.getDate() + 1);
    guard += 1;
  }

  // Floor at 0: avoids negative daysWorked from corrupt or edge-case data (#10).
  out.daysWorked = Math.max(0, out.scheduledDays - out.absentDays - out.halfDays * 0.5);
  if (out.holidayDays > 0 && Number.isFinite(employee.dailyRate)) {
    out.holidayPay = round2(out.holidayDays * employee.dailyRate * HOLIDAY_RATE_MULTIPLIER);
  }
  return out;
}
