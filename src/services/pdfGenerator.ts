import { jsPDF } from 'jspdf';
import type { CutoffSummaryItem, PayrollCutoff } from '../types';

export function generatePayslipPdf(item: CutoffSummaryItem, cutoff: PayrollCutoff): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Colors
  const primary = [15, 23, 42]; // slate-900
  const emerald = [16, 185, 129]; // emerald-500
  const slate600 = [71, 85, 105];

  // Header Banner
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, 210, 32, 'F');

  // Brand title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('KEGAMA LOGISTICS & OPERATIONS', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Official Semi-Monthly Employee Earnings Statement', 14, 23);

  // Cutoff badge
  doc.setFillColor(emerald[0], emerald[1], emerald[2]);
  doc.roundedRect(140, 10, 56, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`CUTOFF: ${cutoff.startDate} - ${cutoff.endDate}`, 143, 17.5);

  // Employee Information Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 40, 182, 32, 2, 2, 'FD');

  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(item.fullName, 20, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(`Employee ID: ${item.employeeId}`, 20, 55);
  doc.text(`Position: ${item.jobTitle}`, 20, 62);
  doc.text(`Department: ${item.department}`, 20, 68);

  doc.text(`Daily Wage Rate: PHP ${item.dailyRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 110, 55);
  doc.text(`Monthly Base: PHP ${item.monthlyBasicRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 110, 62);
  doc.text(`Days Rendered: ${item.totalDaysRendered} days (${item.totalHoursWorked} hrs)`, 110, 68);

  // Earnings Table Header
  let y = 82;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 90, 8, 'F');
  doc.rect(106, y, 90, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text('GROSS EARNINGS', 18, y + 5.5);
  doc.text('DEDUCTIONS & STATUTORY', 110, y + 5.5);

  y += 14;

  // Earnings items
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(primary[0], primary[1], primary[2]);

  const basePay = (item.totalDaysRendered * item.dailyRate);
  doc.text(`Basic Pay (${item.totalDaysRendered} days @ PHP ${item.dailyRate}):`, 18, y);
  doc.text(`PHP ${basePay.toFixed(2)}`, 75, y);

  // Deductions items
  doc.text('SSS (Semi-Monthly Share):', 110, y);
  doc.text(`PHP ${item.sssDeduction.toFixed(2)}`, 165, y);

  y += 8;
  doc.text(`Tardiness (${item.totalLateMinutes} mins):`, 18, y);
  doc.text(`- PHP ${item.lateDeduction.toFixed(2)}`, 75, y);

  doc.text('PhilHealth (Semi-Monthly):', 110, y);
  doc.text(`PHP ${item.philHealthDeduction.toFixed(2)}`, 165, y);

  y += 8;
  doc.text(`Undertime (${item.totalUndertimeMinutes} mins):`, 18, y);
  doc.text(`- PHP ${(item.totalUndertimeMinutes * (item.dailyRate / 480)).toFixed(2)}`, 75, y);

  doc.text('Pag-IBIG (Semi-Monthly):', 110, y);
  doc.text(`PHP ${item.pagIbigDeduction.toFixed(2)}`, 165, y);

  y += 8;
  doc.text('Loan / Cash Advance:', 110, y);
  doc.text(`PHP ${item.loanDeduction.toFixed(2)}`, 165, y);

  y += 12;

  // Totals Divider Line
  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, 104, y);
  doc.line(106, y, 196, y);

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL GROSS:', 18, y);
  doc.text(`PHP ${item.grossEarnings.toFixed(2)}`, 75, y);

  doc.text('TOTAL DEDUCTIONS:', 110, y);
  doc.text(`PHP ${item.totalDeductions.toFixed(2)}`, 165, y);

  // Net Pay Highlight Box
  y += 14;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(52, 211, 153); // emerald-400
  doc.setLineWidth(0.8);
  doc.roundedRect(14, y, 182, 22, 3, 3, 'FD');

  doc.setTextColor(6, 95, 70); // emerald-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('NET TAKE-HOME PAY:', 22, y + 14);

  doc.setFontSize(18);
  doc.text(`PHP ${item.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 120, y + 15);

  // Warnings if any unpaired punches
  y += 30;
  if (item.unpairedPunchesCount > 0) {
    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(248, 113, 113); // red-400
    doc.roundedRect(14, y, 182, 12, 2, 2, 'FD');
    doc.setTextColor(153, 27, 27);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`WARNING: ${item.unpairedPunchesCount} unpaired or missed punch(es) flagged during this cutoff cycle.`, 20, y + 7.5);
    y += 18;
  }

  // Signatures Section
  y = 230;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);

  doc.line(20, y, 80, y);
  doc.line(130, y, 190, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Supervisor Signature / Date Approved', 22, y + 6);
  doc.text('Employee Acknowledgment / Signature', 132, y + 6);

  // Footer Note
  doc.setFontSize(7.5);
  doc.text('Confidential - Generated by Kegama Attendance & Payroll Automated System', 14, 285);
  doc.text(`Timestamp: ${new Date().toLocaleString()}`, 145, 285);

  return doc;
}

export function downloadPayslipPdf(item: CutoffSummaryItem, cutoff: PayrollCutoff) {
  const doc = generatePayslipPdf(item, cutoff);
  doc.save(`Kegama_Payslip_${item.employeeId}_${cutoff.startDate}.pdf`);
}
