import type { Employee, AttendanceLog, PairedShift, CutoffSummaryItem, PayrollCutoff } from '../types';

/**
 * Parses time string (e.g. "08:00" or "22:00") and returns minutes from midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Returns date in YYYY-MM-DD local format
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Pairs attendance logs for a single employee, taking into account:
 * 1. Regular daytime shifts (08:00 - 17:00)
 * 2. Night shifts that cross midnight (e.g. 22:00 -> 06:00 next day)
 * 3. Missed punches (clock-in without clock-out, or clock-out without clock-in)
 */
export function pairEmployeeShifts(employee: Employee, logs: AttendanceLog[]): PairedShift[] {
  // Sort chronologically ascending
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const pairedShifts: PairedShift[] = [];
  let i = 0;

  while (i < sortedLogs.length) {
    const current = sortedLogs[i];

    if (current.logType === 'TIME_IN') {
      const nextLog = sortedLogs[i + 1];

      if (nextLog && nextLog.logType === 'TIME_OUT') {
        const inTime = new Date(current.timestamp).getTime();
        const outTime = new Date(nextLog.timestamp).getTime();
        const hoursDiff = (outTime - inTime) / (1000 * 60 * 60);

        // Acceptable shift window (up to 16 hours max for normal/extended shifts)
        if (hoursDiff > 0 && hoursDiff <= 16) {
          const inDateStr = current.timestamp.slice(0, 10);
          const outDateStr = nextLog.timestamp.slice(0, 10);
          const isMidnightCrossover = inDateStr !== outDateStr;

          // Compute tardiness
          const inDate = new Date(current.timestamp);
          const inMinutes = inDate.getHours() * 60 + inDate.getMinutes();
          const scheduledMinutes = timeStringToMinutes(employee.shiftStart);
          let lateMinutes = 0;

          // For regular shift (e.g. 08:00), compare inMinutes > 480
          // For night shift (e.g. 22:00), compare inMinutes > 1320
          if (employee.shiftType === 'night') {
            // If night shift starts at 22:00, arrival at 22:15 is 15 mins late
            if (inMinutes > scheduledMinutes && inMinutes < scheduledMinutes + 240) {
              lateMinutes = inMinutes - scheduledMinutes;
            }
          } else {
            if (inMinutes > scheduledMinutes) {
              lateMinutes = inMinutes - scheduledMinutes;
            }
          }

          // Undertime (early departure)
          let undertimeMinutes = 0;
          const outDate = new Date(nextLog.timestamp);
          const outMinutes = outDate.getHours() * 60 + outDate.getMinutes();
          const scheduledEndMinutes = timeStringToMinutes(employee.shiftEnd);

          if (employee.shiftType !== 'night' && outMinutes < scheduledEndMinutes) {
            undertimeMinutes = Math.max(0, scheduledEndMinutes - outMinutes);
          } else if (employee.shiftType === 'night' && isMidnightCrossover && outMinutes < scheduledEndMinutes) {
            undertimeMinutes = Math.max(0, scheduledEndMinutes - outMinutes);
          }

          // Hours worked (net of 1h unpaid meal break if > 5 hours)
          const netHours = hoursDiff > 5 ? Math.max(0, hoursDiff - 1) : hoursDiff;
          const overtimeHours = Math.max(0, Number((netHours - 8).toFixed(2)));

          pairedShifts.push({
            id: `SHIFT-${current.id}-${nextLog.id}`,
            employeeId: employee.id,
            shiftDate: inDateStr,
            timeInLog: current,
            timeOutLog: nextLog,
            hoursWorked: Number(netHours.toFixed(2)),
            lateMinutes,
            undertimeMinutes,
            overtimeHours,
            status: current.manualOverride || nextLog.manualOverride ? 'manual_adjusted' : 'complete',
            isMidnightCrossover,
          });

          i += 2; // Handled pair
          continue;
        } else {
          // Difference is greater than 16 hours -> current TIME_IN had a missed punch out!
          pairedShifts.push({
            id: `MISSED-OUT-${current.id}`,
            employeeId: employee.id,
            shiftDate: current.timestamp.slice(0, 10),
            timeInLog: current,
            hoursWorked: 0,
            lateMinutes: 0,
            undertimeMinutes: 0,
            overtimeHours: 0,
            status: 'missing_out',
            isMidnightCrossover: false,
          });
          i++;
          continue;
        }
      } else {
        // Next log is another TIME_IN or end of logs -> missed TIME_OUT!
        pairedShifts.push({
          id: `MISSED-OUT-${current.id}`,
          employeeId: employee.id,
          shiftDate: current.timestamp.slice(0, 10),
          timeInLog: current,
          hoursWorked: 0,
          lateMinutes: 0,
          undertimeMinutes: 0,
          overtimeHours: 0,
          status: 'missing_out',
          isMidnightCrossover: false,
        });
        i++;
        continue;
      }
    } else {
      // Current log is TIME_OUT without prior TIME_IN -> missed TIME_IN!
      pairedShifts.push({
        id: `MISSED-IN-${current.id}`,
        employeeId: employee.id,
        shiftDate: current.timestamp.slice(0, 10),
        timeOutLog: current,
        hoursWorked: 0,
        lateMinutes: 0,
        undertimeMinutes: 0,
        overtimeHours: 0,
        status: 'missing_in',
        isMidnightCrossover: false,
      });
      i++;
      continue;
    }
  }

  return pairedShifts;
}

/**
 * Calculates semi-monthly payroll for all employees within a date range (e.g. 1st - 15th)
 */
export function compileCutoffPayroll(
  cutoffId: string,
  cutoffName: string,
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
  employees: Employee[],
  allLogs: AttendanceLog[]
): PayrollCutoff {
  const startTs = new Date(`${startDate}T00:00:00Z`).getTime();
  const endTs = new Date(`${endDate}T23:59:59Z`).getTime();

  // Filter logs within range (or logs within range + morning of day after endDate for night shift crossover)
  const windowLogs = allLogs.filter((log) => {
    const logTs = new Date(log.timestamp).getTime();
    // Allow up to 12 hours after endDate to capture midnight crossover punch out
    return logTs >= startTs && logTs <= endTs + 12 * 60 * 60 * 1000;
  });

  const items: CutoffSummaryItem[] = [];

  for (const emp of employees) {
    if (emp.status !== 'active') continue;

    const empLogs = windowLogs.filter((l) => l.employeeId === emp.id);
    const shifts = pairEmployeeShifts(emp, empLogs);

    // Filter shifts belonging to the cutoff window by shiftDate
    const cutoffShifts = shifts.filter((s) => s.shiftDate >= startDate && s.shiftDate <= endDate);

    let totalDaysRendered = 0;
    let totalHoursWorked = 0;
    let totalLateMinutes = 0;
    let totalUndertimeMinutes = 0;
    let totalOvertimeHours = 0;
    let unpairedCount = 0;

    for (const shift of cutoffShifts) {
      if (shift.status === 'complete' || shift.status === 'manual_adjusted') {
        totalDaysRendered += 1;
        totalHoursWorked += shift.hoursWorked;
        totalLateMinutes += shift.lateMinutes;
        totalUndertimeMinutes += shift.undertimeMinutes;
        totalOvertimeHours += shift.overtimeHours;
      } else {
        unpairedCount += 1;
      }
    }

    // Statutory and wage math
    const hourlyRate = emp.dailyRate / 8;
    const minuteRate = hourlyRate / 60;

    const baseEarnings = totalDaysRendered * emp.dailyRate;
    const lateDeduction = Number((totalLateMinutes * minuteRate).toFixed(2));
    const undertimeDeduction = Number((totalUndertimeMinutes * minuteRate).toFixed(2));
    const overtimePay = Number((totalOvertimeHours * hourlyRate * 1.25).toFixed(2));

    const grossEarnings = Math.max(0, Number((baseEarnings - lateDeduction - undertimeDeduction + overtimePay).toFixed(2)));

    // Statutory deductions: Semi-monthly is exactly half of the monthly employee share
    const sssDeduction = Number((emp.sssShare / 2).toFixed(2));
    const philHealthDeduction = Number((emp.philHealthShare / 2).toFixed(2));
    const pagIbigDeduction = Number((emp.pagIbigShare / 2).toFixed(2));

    // Loan deduction: up to loan balance or standard installment (e.g. 500 max per cutoff)
    const loanDeduction = Math.min(emp.loanBalance, 500);

    const totalDeductions = Number((sssDeduction + philHealthDeduction + pagIbigDeduction + loanDeduction).toFixed(2));
    const netPay = Math.max(0, Number((grossEarnings - totalDeductions).toFixed(2)));

    items.push({
      employeeId: emp.id,
      fullName: emp.fullName,
      jobTitle: emp.jobTitle,
      department: emp.department,
      dailyRate: emp.dailyRate,
      monthlyBasicRate: emp.monthlyBasicRate,
      totalDaysRendered,
      totalHoursWorked: Number(totalHoursWorked.toFixed(2)),
      totalLateMinutes,
      totalUndertimeMinutes,
      lateDeduction,
      grossEarnings,
      sssDeduction,
      philHealthDeduction,
      pagIbigDeduction,
      loanDeduction,
      totalDeductions,
      netPay,
      unpairedPunchesCount: unpairedCount,
      pairedShifts: cutoffShifts,
    });
  }

  const totalGross = Number(items.reduce((sum, item) => sum + item.grossEarnings, 0).toFixed(2));
  const totalDeductions = Number(items.reduce((sum, item) => sum + item.totalDeductions, 0).toFixed(2));
  const totalNet = Number(items.reduce((sum, item) => sum + item.netPay, 0).toFixed(2));

  return {
    id: cutoffId,
    cutoffName,
    startDate,
    endDate,
    status: 'compiled',
    compiledAt: new Date().toISOString(),
    totalGross,
    totalDeductions,
    totalNet,
    items,
  };
}
