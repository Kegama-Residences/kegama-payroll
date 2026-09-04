<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useEmployeeStore } from '../../stores/employeeStore';
import { useAttendanceStore } from '../../stores/attendanceStore';
import { compileCutoffPayroll } from '../../services/payrollEngine';
import { downloadPayslipPdf } from '../../services/pdfGenerator';
import type { PayrollCutoff, CutoffSummaryItem } from '../../types';
import PayslipModal from '../../components/PayslipModal.vue';
import {
  Calculator,
  Calendar,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingDown
} from 'lucide-vue-next';

const employeeStore = useEmployeeStore();
const attendanceStore = useAttendanceStore();

// Selected Cutoff Range
const cutoffPreset = ref<'first_half' | 'second_half' | 'custom'>('first_half');
const startDate = ref('2026-09-01');
const endDate = ref('2026-09-15');
const cutoffName = ref('Sept 1 – Sept 15, 2026 (1st Half)');

// Active compiled payroll cutoff
const currentCutoff = ref<PayrollCutoff | null>(null);

// Payslip Modal
const isPayslipModalOpen = ref(false);
const selectedItemForPayslip = ref<CutoffSummaryItem | null>(null);

onMounted(async () => {
  await employeeStore.loadEmployees();
  await attendanceStore.loadLogs();
  runCompilation();
});

function onPresetChange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  if (cutoffPreset.value === 'first_half') {
    startDate.value = `${year}-${month}-01`;
    endDate.value = `${year}-${month}-15`;
    cutoffName.value = `${now.toLocaleString('en-US', { month: 'short' })} 1 – 15, ${year} (1st Half)`;
  } else if (cutoffPreset.value === 'second_half') {
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    startDate.value = `${year}-${month}-16`;
    endDate.value = `${year}-${month}-${lastDay}`;
    cutoffName.value = `${now.toLocaleString('en-US', { month: 'short' })} 16 – ${lastDay}, ${year} (2nd Half)`;
  }
  runCompilation();
}

function runCompilation() {
  const cutoffId = `CUTOFF-${startDate.value}-to-${endDate.value}`;
  currentCutoff.value = compileCutoffPayroll(
    cutoffId,
    cutoffName.value,
    startDate.value,
    endDate.value,
    employeeStore.employees,
    attendanceStore.logs
  );
}

function openPayslip(item: CutoffSummaryItem) {
  selectedItemForPayslip.value = item;
  isPayslipModalOpen.value = true;
}

function handleDownloadSinglePdf(item: CutoffSummaryItem) {
  if (currentCutoff.value) {
    downloadPayslipPdf(item, currentCutoff.value);
  }
}

// Check if any employees in this cutoff have unresolved punches
const totalCutoffUnpairedCount = computed(() => {
  if (!currentCutoff.value) return 0;
  return currentCutoff.value.items.reduce((acc, item) => acc + item.unpairedPunchesCount, 0);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Calculator class="w-6 h-6 text-emerald-400" />
          <span>Semi-Monthly Payroll Compilation</span>
        </h1>
        <p class="text-xs text-slate-400 mt-1">
          Automated shift matching, night crossover tallying, statutory deductions & payslip generator
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="runCompilation"
          class="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <Calculator class="w-4 h-4" />
          <span>Recalculate Cutoff</span>
        </button>
      </div>
    </div>

    <!-- CUTOFF PERIOD SELECTOR BAR -->
    <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <Calendar class="w-4 h-4 text-emerald-400" />
          <span class="text-xs font-bold text-white uppercase tracking-wider">Cutoff Cycle:</span>
        </div>

        <select
          v-model="cutoffPreset"
          @change="onPresetChange"
          class="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="first_half">1st Half (1st – 15th)</option>
          <option value="second_half">2nd Half (16th – End of Month)</option>
          <option value="custom">Custom Date Range</option>
        </select>

        <div class="flex items-center gap-2">
          <input
            type="date"
            v-model="startDate"
            @change="runCompilation"
            class="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
          />
          <span class="text-slate-500 text-xs">to</span>
          <input
            type="date"
            v-model="endDate"
            @change="runCompilation"
            class="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div class="text-xs text-slate-400">
        Engine Mode: <span class="text-emerald-400 font-bold">Philippine Statutory (Semi-Monthly Half Share)</span>
      </div>
    </div>

    <!-- MISSED PUNCHES WARNING ALERT (If detected in current cycle) -->
    <div
      v-if="totalCutoffUnpairedCount > 0"
      class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4 text-xs text-amber-300"
    >
      <div class="flex items-center gap-2.5">
        <AlertTriangle class="w-5 h-5 text-amber-400 shrink-0" />
        <div>
          <span class="font-bold">Notice: {{ totalCutoffUnpairedCount }} unpaired punch(es) detected in this cutoff cycle.</span>
          <p class="text-amber-300/80 mt-0.5">
            Employees with missing punch-outs are flagged below with warning tags. We recommend approving missing punches in the Attendance view prior to final release.
          </p>
        </div>
      </div>
    </div>

    <!-- TOTAL DISBURSEMENT SUMMARY CARDS -->
    <div v-if="currentCutoff" class="grid grid-cols-1 sm:grid-cols-3 gap-5">
      <!-- Total Gross Pay -->
      <div class="p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-lg">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Gross Earnings</span>
          <div class="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <DollarSign class="w-5 h-5" />
          </div>
        </div>
        <div class="text-3xl font-black font-mono text-white mt-2">
          PHP {{ currentCutoff.totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
        </div>
        <div class="text-[11px] text-slate-400 mt-1">Based on validated workdays rendered & tardiness deductions</div>
      </div>

      <!-- Total Deductions -->
      <div class="p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-lg">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Deductions</span>
          <div class="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <TrendingDown class="w-5 h-5" />
          </div>
        </div>
        <div class="text-3xl font-black font-mono text-amber-400 mt-2">
          PHP {{ currentCutoff.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
        </div>
        <div class="text-[11px] text-slate-400 mt-1">SSS, PhilHealth, Pag-IBIG (half share) + loan balances</div>
      </div>

      <!-- Total Net Disbursed -->
      <div class="p-5 bg-slate-900 border border-emerald-500/30 rounded-3xl shadow-lg bg-gradient-to-b from-slate-900 to-emerald-950/20">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Net Take-Home</span>
          <div class="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
            <CheckCircle2 class="w-5 h-5" />
          </div>
        </div>
        <div class="text-3xl font-black font-mono text-emerald-400 mt-2">
          PHP {{ currentCutoff.totalNet.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
        </div>
        <div class="text-[11px] text-emerald-300/80 mt-1">Total payroll payout for {{ currentCutoff.items.length }} registered staff</div>
      </div>
    </div>

    <!-- CUTOFF ROSTER BREAKDOWN TABLE -->
    <div v-if="currentCutoff" class="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
      <div class="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-white">Cutoff Calculation Summary</h2>
          <p class="text-xs text-slate-400">Itemized statutory breakdown and net take-home per employee</p>
        </div>
        <div class="text-xs font-mono text-slate-400">
          Compiled: {{ new Date(currentCutoff.compiledAt).toLocaleTimeString() }}
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase tracking-wider font-semibold">
              <th class="p-4">Employee</th>
              <th class="p-4">Days / Hours</th>
              <th class="p-4">Tardiness</th>
              <th class="p-4">Gross Earnings</th>
              <th class="p-4">Statutory Deductions (1/2)</th>
              <th class="p-4">Loan Ded.</th>
              <th class="p-4">Net Take-Home</th>
              <th class="p-4 text-right">Official Payslip</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            <tr
              v-for="item in currentCutoff.items"
              :key="item.employeeId"
              class="hover:bg-slate-800/40 transition"
              :class="{ 'bg-amber-500/5': item.unpairedPunchesCount > 0 }"
            >
              <!-- Employee info -->
              <td class="p-4">
                <div class="font-bold text-white flex items-center gap-1.5">
                  <span>{{ item.fullName }}</span>
                  <span
                    v-if="item.unpairedPunchesCount > 0"
                    class="p-0.5 rounded text-amber-400"
                    title="Missed punch in cycle"
                  >
                    <AlertTriangle class="w-3.5 h-3.5" />
                  </span>
                </div>
                <div class="text-[10px] text-slate-400 font-mono">
                  {{ item.employeeId }} • PHP {{ item.dailyRate }}/day
                </div>
              </td>

              <!-- Days / Hours -->
              <td class="p-4">
                <div class="font-mono font-bold text-white">{{ item.totalDaysRendered }} days</div>
                <div class="text-[10px] text-slate-400 font-mono">{{ item.totalHoursWorked }} hrs total</div>
              </td>

              <!-- Tardiness -->
              <td class="p-4 font-mono">
                <div :class="item.totalLateMinutes > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'">
                  {{ item.totalLateMinutes }} mins
                </div>
                <div v-if="item.lateDeduction > 0" class="text-[10px] text-slate-500">
                  - PHP {{ item.lateDeduction.toFixed(2) }}
                </div>
              </td>

              <!-- Gross Earnings -->
              <td class="p-4 font-mono font-bold text-white text-sm">
                PHP {{ item.grossEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
              </td>

              <!-- Statutory deductions itemized -->
              <td class="p-4 font-mono text-[11px] text-slate-300 space-y-0.5">
                <div>SSS: PHP {{ item.sssDeduction.toFixed(2) }}</div>
                <div>PhilH: PHP {{ item.philHealthDeduction.toFixed(2) }}</div>
                <div>PagIBIG: PHP {{ item.pagIbigDeduction.toFixed(2) }}</div>
              </td>

              <!-- Loan Deduction -->
              <td class="p-4 font-mono text-amber-400">
                PHP {{ item.loanDeduction.toFixed(2) }}
              </td>

              <!-- Net Take-Home -->
              <td class="p-4">
                <div class="font-mono font-black text-emerald-400 text-sm">
                  PHP {{ item.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                </div>
                <span
                  v-if="item.unpairedPunchesCount > 0"
                  class="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold"
                >
                  {{ item.unpairedPunchesCount }} Unpaired Punch
                </span>
              </td>

              <!-- Actions -->
              <td class="p-4 text-right">
                <div class="inline-flex items-center gap-1.5">
                  <button
                    @click="openPayslip(item)"
                    class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1"
                    title="Preview Payslip"
                  >
                    <FileText class="w-3.5 h-3.5 text-emerald-400" />
                    <span>View</span>
                  </button>

                  <button
                    @click="handleDownloadSinglePdf(item)"
                    class="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition"
                    title="Direct Download PDF"
                  >
                    <Download class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Payslip View Modal -->
    <PayslipModal
      :is-open="isPayslipModalOpen"
      :item="selectedItemForPayslip"
      :cutoff="currentCutoff"
      @close="isPayslipModalOpen = false"
    />
  </div>
</template>
