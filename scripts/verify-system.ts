import { pairEmployeeShifts, compileCutoffPayroll } from '../src/services/payrollEngine';
import { generateEncryptedQrToken, parseAndVerifyQrToken } from '../src/services/crypto';
import type { Employee, AttendanceLog } from '../src/types';

console.log('🧪 Starting Kegama Verification Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    process.exitCode = 1;
  }
}

// --------------------------------------------------------------------------
// TEST 1: QR Code Generation and Decryption
// --------------------------------------------------------------------------
console.log('--- TEST GROUP 1: Digital QR Token Cryptography ---');
const sampleEmployee: Employee = {
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
  createdAt: '2026-01-10T08:00:00Z',
};

const token = generateEncryptedQrToken(sampleEmployee);
assert(token.startsWith('KEGAMA:PASS:'), 'Token has valid KEGAMA prefix');

const verified = parseAndVerifyQrToken(token);
assert(verified.success === true && verified.employeeId === 'KR-001', 'Token successfully verified and decrypted to KR-001');

// Test Direct ID barcode format
const directIdResult = parseAndVerifyQrToken('KR-001');
assert(directIdResult.success === true && directIdResult.employeeId === 'KR-001', 'Direct badge ID format supported');

// Test Tampered token
const tamperedToken = token.slice(0, -4) + 'AAAA';
const tamperedResult = parseAndVerifyQrToken(tamperedToken);
assert(tamperedResult.success === false || tamperedResult.employeeId !== 'KR-001', 'Tampered token rejected by cryptographic verification');


// --------------------------------------------------------------------------
// TEST 2: Regular Daytime Shift Pairing
// --------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Regular Shift Pairing ---');
const regularLogs: AttendanceLog[] = [
  {
    id: 'LOG-1',
    employeeId: 'KR-001',
    logType: 'TIME_IN',
    timestamp: '2026-09-01T08:10:00Z', // 10 minutes late
    manualOverride: false,
    synced: true,
    deviceId: 'KIOSK-01',
  },
  {
    id: 'LOG-2',
    employeeId: 'KR-001',
    logType: 'TIME_OUT',
    timestamp: '2026-09-01T17:10:00Z',
    manualOverride: false,
    synced: true,
    deviceId: 'KIOSK-01',
  },
];

const regularPairs = pairEmployeeShifts(sampleEmployee, regularLogs);
assert(regularPairs.length === 1, 'Regular logs produce 1 paired shift');
assert(regularPairs[0].status === 'complete', 'Regular shift status is complete');
assert(regularPairs[0].lateMinutes === 10, 'Tardiness calculated as 10 minutes late');
assert(regularPairs[0].isMidnightCrossover === false, 'Regular daytime shift is not a midnight crossover');


// --------------------------------------------------------------------------
// TEST 3: Night Shift & Midnight Crossover
// --------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Night Shift & Midnight Crossover ---');
const nightEmployee: Employee = {
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
  createdAt: '2026-01-15T08:00:00Z',
};

const nightLogs: AttendanceLog[] = [
  // Night shift started on Sept 01 at 22:00 and ended on Sept 02 at 06:00
  {
    id: 'LOG-N1',
    employeeId: 'KR-002',
    logType: 'TIME_IN',
    timestamp: '2026-09-01T22:00:00Z',
    manualOverride: false,
    synced: true,
    deviceId: 'KIOSK-01',
  },
  {
    id: 'LOG-N2',
    employeeId: 'KR-002',
    logType: 'TIME_OUT',
    timestamp: '2026-09-02T06:00:00Z',
    manualOverride: false,
    synced: true,
    deviceId: 'KIOSK-01',
  },
];

const nightPairs = pairEmployeeShifts(nightEmployee, nightLogs);
assert(nightPairs.length === 1, 'Night shift punches properly paired across midnight');
assert(nightPairs[0].isMidnightCrossover === true, 'Midnight crossover flag is TRUE');
assert(nightPairs[0].shiftDate === '2026-09-01', 'Shift date correctly attributed to Day 1 (2026-09-01)');
assert(nightPairs[0].status === 'complete', 'Night shift marked complete');


// --------------------------------------------------------------------------
// TEST 4: Missed Punches & Warnings
// --------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Missed Punches Flagging ---');
const missedPunchLogs: AttendanceLog[] = [
  // Employee clocks in, forgets to clock out
  {
    id: 'LOG-M1',
    employeeId: 'KR-003',
    logType: 'TIME_IN',
    timestamp: '2026-09-02T08:00:00Z',
    manualOverride: false,
    synced: true,
    deviceId: 'KIOSK-01',
  },
  // Next day clocks in again
  {
    id: 'LOG-M2',
    employeeId: 'KR-003',
    logType: 'TIME_IN',
    timestamp: '2026-09-03T08:00:00Z',
    manualOverride: false,
    synced: true,
    deviceId: 'KIOSK-01',
  },
  {
    id: 'LOG-M3',
    employeeId: 'KR-003',
    logType: 'TIME_OUT',
    timestamp: '2026-09-03T17:00:00Z',
    manualOverride: false,
    synced: true,
    deviceId: 'KIOSK-01',
  },
];

const securityOfficer: Employee = {
  id: 'KR-003',
  fullName: 'Carlos Reyes',
  jobTitle: 'Security Officer',
  department: 'Security',
  dailyRate: 720,
  monthlyBasicRate: 18720,
  sssShare: 800,
  philHealthShare: 400,
  pagIbigShare: 200,
  shiftType: 'regular',
  shiftStart: '08:00',
  shiftEnd: '17:00',
  loanBalance: 500,
  status: 'active',
  createdAt: '2026-02-01T08:00:00Z',
};

const missedPairs = pairEmployeeShifts(securityOfficer, missedPunchLogs);
assert(missedPairs.length === 2, 'Two shifts analyzed');
assert(missedPairs[0].status === 'missing_out', 'First shift flagged as missing_out (unpaired punch)');
assert(missedPairs[1].status === 'complete', 'Second shift paired successfully');


// --------------------------------------------------------------------------
// TEST 5: Semi-Monthly Payroll Compilation Engine
// --------------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: Cutoff Payroll Calculation Engine ---');
const cutoff = compileCutoffPayroll(
  'CUTOFF-TEST-01',
  'Sept 1 - Sept 15, 2026 (1st Half)',
  '2026-09-01',
  '2026-09-15',
  [sampleEmployee, nightEmployee, securityOfficer],
  [...regularLogs, ...nightLogs, ...missedPunchLogs]
);

assert(cutoff.items.length === 3, 'Cutoff compiled for 3 employees');

// Check Maria Santos (KR-001)
const mariaSummary = cutoff.items.find((i) => i.employeeId === 'KR-001')!;
assert(mariaSummary.totalDaysRendered === 1, 'Maria Santos rendered 1 valid day');
// Daily rate 850, 10 min late deduction = (850 / 8 / 60) * 10 = 17.71
assert(mariaSummary.lateDeduction > 0, 'Late deduction calculated for tardiness');
// Statutory deductions (half of monthly)
assert(mariaSummary.sssDeduction === sampleEmployee.sssShare / 2, 'SSS deduction is exactly half monthly share (475.00)');
assert(mariaSummary.philHealthDeduction === sampleEmployee.philHealthShare / 2, 'PhilHealth deduction is half monthly share (225.00)');
assert(mariaSummary.pagIbigDeduction === sampleEmployee.pagIbigShare / 2, 'Pag-IBIG deduction is half monthly share (100.00)');

// Check Carlos Reyes (KR-003) warning tag
const carlosSummary = cutoff.items.find((i) => i.employeeId === 'KR-003')!;
assert(carlosSummary.unpairedPunchesCount === 1, 'Carlos Reyes flagged with 1 unpaired punch in cutoff summary');

console.log(`\n🎉 Results: ${passedTests} / ${totalTests} tests passed!`);
if (passedTests === totalTests) {
  console.log('✅ ALL TEST SUITES PASSED CLEANLY!\n');
} else {
  process.exit(1);
}
