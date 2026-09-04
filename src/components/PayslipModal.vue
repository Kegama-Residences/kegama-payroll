<script setup lang="ts">
import type { CutoffSummaryItem, PayrollCutoff } from '../types';
import { downloadPayslipPdf } from '../services/pdfGenerator';
import { X, Download, Printer, ShieldAlert, FileText } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  item: CutoffSummaryItem | null;
  cutoff: PayrollCutoff | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

function handleDownloadPdf() {
  if (props.item && props.cutoff) {
    downloadPayslipPdf(props.item, props.cutoff);
  }
}

function handlePrint() {
  window.print();
}
</script>

<template>
  <div v-if="isOpen && item && cutoff" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-fadeIn">
    <div class="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
      <!-- Top Modal Header -->
      <div class="no-print px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
        <div class="flex items-center gap-2">
          <FileText class="w-5 h-5 text-emerald-400" />
          <h3 class="text-base font-bold text-white">Official Payslip Statement</h3>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="handlePrint"
            class="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition"
            title="Print Document"
          >
            <Printer class="w-4 h-4" />
            <span>Print</span>
          </button>
          <button
            @click="handleDownloadPdf"
            class="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20"
            title="Download PDF"
          >
            <Download class="w-4 h-4" />
            <span>Download PDF</span>
          </button>
          <button
            @click="emit('close')"
            class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-2"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Payslip Content Body (Printable Area) -->
      <div id="payslip-print-area" class="p-8 bg-white text-slate-900 space-y-6">
        <!-- Brand & Cutoff Header -->
        <div class="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
          <div>
            <h1 class="text-2xl font-black tracking-tight text-slate-950">KEGAMA LOGISTICS & OPERATIONS</h1>
            <p class="text-xs uppercase tracking-widest text-slate-500 font-semibold mt-0.5">Automated Semi-Monthly Payroll Statement</p>
          </div>
          <div class="text-right">
            <span class="inline-block px-3 py-1 bg-slate-900 text-white rounded font-mono text-xs font-bold">
              {{ cutoff.startDate }} to {{ cutoff.endDate }}
            </span>
            <p class="text-[11px] text-slate-500 mt-1">Period: {{ cutoff.cutoffName }}</p>
          </div>
        </div>

        <!-- Employee Info Card -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4 text-xs">
          <div>
            <div class="text-slate-500 font-medium">Employee Name:</div>
            <div class="text-sm font-bold text-slate-950 mt-0.5">{{ item.fullName }}</div>
            <div class="text-slate-600 mt-1">ID: <span class="font-mono font-bold">{{ item.employeeId }}</span></div>
            <div class="text-slate-600">Position: {{ item.jobTitle }}</div>
          </div>
          <div>
            <div class="text-slate-500 font-medium">Department:</div>
            <div class="text-sm font-bold text-slate-950 mt-0.5">{{ item.department }}</div>
            <div class="text-slate-600 mt-1">Daily Wage: PHP {{ item.dailyRate.toLocaleString() }}</div>
            <div class="text-slate-600">Monthly Base: PHP {{ item.monthlyBasicRate.toLocaleString() }}</div>
          </div>
        </div>

        <!-- Attendance Stats Pill -->
        <div class="grid grid-cols-4 gap-2 text-center text-xs">
          <div class="p-2.5 bg-slate-100 rounded-lg">
            <div class="text-slate-500 text-[10px] uppercase font-bold">Days Rendered</div>
            <div class="text-base font-bold text-slate-900 mt-0.5">{{ item.totalDaysRendered }}</div>
          </div>
          <div class="p-2.5 bg-slate-100 rounded-lg">
            <div class="text-slate-500 text-[10px] uppercase font-bold">Total Hours</div>
            <div class="text-base font-bold text-slate-900 mt-0.5">{{ item.totalHoursWorked }} hrs</div>
          </div>
          <div class="p-2.5 bg-slate-100 rounded-lg">
            <div class="text-slate-500 text-[10px] uppercase font-bold">Tardiness</div>
            <div class="text-base font-bold text-amber-700 mt-0.5">{{ item.totalLateMinutes }} mins</div>
          </div>
          <div class="p-2.5 bg-slate-100 rounded-lg">
            <div class="text-slate-500 text-[10px] uppercase font-bold">Undertime</div>
            <div class="text-base font-bold text-slate-900 mt-0.5">{{ item.totalUndertimeMinutes }} mins</div>
          </div>
        </div>

        <!-- Itemized Breakdown Table -->
        <div class="grid grid-cols-2 gap-6 text-xs">
          <!-- Earnings Column -->
          <div>
            <div class="font-bold border-b border-slate-300 pb-1.5 text-slate-900 flex justify-between">
              <span>GROSS EARNINGS</span>
              <span>AMOUNT</span>
            </div>
            <div class="divide-y divide-slate-100">
              <div class="py-2 flex justify-between">
                <span class="text-slate-600">Basic Pay ({{ item.totalDaysRendered }} days)</span>
                <span class="font-mono font-medium">PHP {{ (item.totalDaysRendered * item.dailyRate).toFixed(2) }}</span>
              </div>
              <div class="py-2 flex justify-between text-amber-700">
                <span>Late Deductions ({{ item.totalLateMinutes }} mins)</span>
                <span class="font-mono font-medium">- PHP {{ item.lateDeduction.toFixed(2) }}</span>
              </div>
              <div class="py-2 flex justify-between text-amber-700">
                <span>Undertime ({{ item.totalUndertimeMinutes }} mins)</span>
                <span class="font-mono font-medium">- PHP {{ (item.totalUndertimeMinutes * (item.dailyRate / 480)).toFixed(2) }}</span>
              </div>
            </div>
            <div class="border-t-2 border-slate-900 mt-3 pt-2 flex justify-between font-bold text-sm">
              <span>Total Gross:</span>
              <span class="font-mono text-emerald-800">PHP {{ item.grossEarnings.toFixed(2) }}</span>
            </div>
          </div>

          <!-- Deductions Column -->
          <div>
            <div class="font-bold border-b border-slate-300 pb-1.5 text-slate-900 flex justify-between">
              <span>ITEMIZED DEDUCTIONS</span>
              <span>AMOUNT</span>
            </div>
            <div class="divide-y divide-slate-100">
              <div class="py-2 flex justify-between">
                <span class="text-slate-600">SSS (Semi-Monthly Share)</span>
                <span class="font-mono font-medium">PHP {{ item.sssDeduction.toFixed(2) }}</span>
              </div>
              <div class="py-2 flex justify-between">
                <span class="text-slate-600">PhilHealth (Semi-Monthly)</span>
                <span class="font-mono font-medium">PHP {{ item.philHealthDeduction.toFixed(2) }}</span>
              </div>
              <div class="py-2 flex justify-between">
                <span class="text-slate-600">Pag-IBIG (Semi-Monthly)</span>
                <span class="font-mono font-medium">PHP {{ item.pagIbigDeduction.toFixed(2) }}</span>
              </div>
              <div class="py-2 flex justify-between text-amber-800">
                <span>Cash Advance / Loan</span>
                <span class="font-mono font-medium">PHP {{ item.loanDeduction.toFixed(2) }}</span>
              </div>
            </div>
            <div class="border-t-2 border-slate-900 mt-3 pt-2 flex justify-between font-bold text-sm">
              <span>Total Deductions:</span>
              <span class="font-mono text-amber-800">PHP {{ item.totalDeductions.toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <!-- Net Take-Home Highlight -->
        <div class="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div class="text-xs font-bold text-emerald-800 uppercase tracking-wider">Net Take-Home Pay</div>
            <div class="text-[11px] text-emerald-700">Calculated net of statutory contributions & loan deductions</div>
          </div>
          <div class="text-3xl font-black font-mono text-emerald-900">
            PHP {{ item.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
          </div>
        </div>

        <!-- Unpaired Punches Warning if present -->
        <div v-if="item.unpairedPunchesCount > 0" class="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800">
          <ShieldAlert class="w-4 h-4 shrink-0 text-red-600" />
          <span>Notice: {{ item.unpairedPunchesCount }} unpaired punch(es) detected. Ensure supervisor approval is recorded before payout.</span>
        </div>

        <!-- Signature lines for physical signoff -->
        <div class="pt-8 grid grid-cols-2 gap-12 text-xs">
          <div class="border-t border-slate-400 pt-2 text-center text-slate-600">
            <p class="font-semibold text-slate-800">Approved by Shift Supervisor</p>
            <p class="text-[10px] text-slate-500 mt-0.5">Signature over Printed Name</p>
          </div>
          <div class="border-t border-slate-400 pt-2 text-center text-slate-600">
            <p class="font-semibold text-slate-800">Received by Employee</p>
            <p class="text-[10px] text-slate-500 mt-0.5">Signature over Printed Name / Date</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
