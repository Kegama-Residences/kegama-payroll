import { describe, expect, it } from 'vitest';
import {
  buildMonthGrid,
  getDayRecord,
  setDayRecord,
  summarizePeriod,
  type AttendanceMap,
} from '../attendance';
import type { Employee } from '../../types/payroll';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-cal-1',
    employeeNumber: 'KGM-0001',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    email: 'juan@example.com',
    phone: '+639171234567',
    jobTitle: 'Staff',
    department: 'Operations',
    hireDate: '2024-01-15',
    employmentType: 'regular',
    monthlyRate: 20000,
    dailyRate: 1000,
    hourlyRate: 125,
    governmentIds: { tin: '', sss: '', philhealth: '', pagibig: '' },
    bankDetails: { bankName: 'BDO', accountNumber: '1' },
    allowances: [],
    customDeductions: [],
    status: 'active',
    ...overrides,
  };
}

describe('buildMonthGrid', () => {
  it('starts weeks on Monday with null padding', () => {
    // Sep 1 2026 is a Tuesday => first cell padded, 5 rows
    const weeks = buildMonthGrid(2026, 8);
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toBeNull();
    expect(weeks[0][1]?.getDate()).toBe(1);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });
});

describe('setDayRecord / getDayRecord', () => {
  it('sets, reads, and clears marks (pure, no mutation)', () => {
    const base: AttendanceMap = {};
    const marked = setDayRecord(base, 'e1', '2026-09-02', { status: 'absent' });
    expect(base).toEqual({});
    expect(getDayRecord(marked, 'e1', '2026-09-02')).toEqual({ status: 'absent' });
    const cleared = setDayRecord(marked, 'e1', '2026-09-02', undefined);
    expect(cleared).toEqual({});
  });
});

describe('summarizePeriod (Sep 1-15 2026, 6-day Sunday rest)', () => {
  const emp = makeEmployee();
  it('counts 13 scheduled days with no marks', () => {
    const s = summarizePeriod(emp, {}, '2026-09-01', '2026-09-15');
    expect(s.scheduledDays).toBe(13);
    expect(s.daysWorked).toBe(13);
    expect(s.undertimeMinutes).toBe(0);
    expect(s.hasMarks).toBe(false);
  });
  it('docks absences as undertime minutes', () => {
    const map = setDayRecord({}, emp.id, '2026-09-02', { status: 'absent' });
    const s = summarizePeriod(emp, map, '2026-09-01', '2026-09-15');
    expect(s.absentDays).toBe(1);
    expect(s.undertimeMinutes).toBe(480);
    expect(s.daysWorked).toBe(12);
    expect(s.hasMarks).toBe(true);
  });
  it('docks half-days 4h and keeps the .5 day', () => {
    const map = setDayRecord({}, emp.id, '2026-09-03', { status: 'half-day' });
    const s = summarizePeriod(emp, map, '2026-09-01', '2026-09-15');
    expect(s.halfDays).toBe(1);
    expect(s.undertimeMinutes).toBe(240);
    expect(s.daysWorked).toBe(12.5);
  });
  it('treats leave as paid and pays worked holidays at 200%', () => {
    let map: AttendanceMap = {};
    map = setDayRecord(map, emp.id, '2026-09-04', { status: 'leave' });
    map = setDayRecord(map, emp.id, '2026-09-07', { status: 'holiday' });
    const s = summarizePeriod(emp, map, '2026-09-01', '2026-09-15');
    expect(s.leaveDays).toBe(1);
    expect(s.holidayDays).toBe(1);
    expect(s.daysWorked).toBe(13);
    expect(s.holidayPay).toBe(2000);
  });
  it('sums OT, night-diff, and tardiness across marked days', () => {
    let map: AttendanceMap = {};
    map = setDayRecord(map, emp.id, '2026-09-02', { status: 'absent' });
    map = setDayRecord(map, emp.id, '2026-09-03', {
      status: 'holiday',
      overtimeHours: 2,
      nightDiffHours: 1,
      tardinessMinutes: 15,
    });
    const s = summarizePeriod(emp, map, '2026-09-01', '2026-09-15');
    expect(s.overtimeHours).toBe(2);
    expect(s.nightDiffHours).toBe(1);
    expect(s.tardinessMinutes).toBe(15);
    expect(s.undertimeMinutes).toBe(480);
  });
  it('keeps rest-day absences undocked but still counts Sunday OT work', () => {
    // Sep 6 2026 is a Sunday (rest day)
    const map = setDayRecord({}, emp.id, '2026-09-06', { status: 'absent', overtimeHours: 3 });
    const s = summarizePeriod(emp, map, '2026-09-01', '2026-09-15');
    expect(s.absentDays).toBe(0);
    expect(s.undertimeMinutes).toBe(0);
    expect(s.restDayOvertimeHours).toBe(3);
    expect(s.overtimeHours).toBe(0);
    expect(s.hasMarks).toBe(true);
  });
  it('returns empty on invalid ranges', () => {
    const s = summarizePeriod(emp, {}, '2026-09-15', '2026-09-01');
    expect(s.scheduledDays).toBe(0);
    expect(s.hasMarks).toBe(false);
  });
});
