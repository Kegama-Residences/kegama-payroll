<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useEmployeeStore } from '../../stores/employeeStore';
import { useAttendanceStore } from '../../stores/attendanceStore';
import { pairEmployeeShifts } from '../../services/payrollEngine';
import type { LogType, PairedShift } from '../../types';
import ManualPunchModal from '../../components/ManualPunchModal.vue';
import {
  CalendarCheck,
  Plus,
  AlertTriangle,
  Moon,
  Trash2,
  Edit,
  CheckCircle2
} from 'lucide-vue-next';

const employeeStore = useEmployeeStore();
const attendanceStore = useAttendanceStore();

const activeTab = ref<'pairs' | 'raw'>('pairs');
const selectedEmployeeId = ref('ALL');
const filterStatus = ref('ALL');

// Manual Punch Modal State
const isManualModalOpen = ref(false);
const modalEmployeeId = ref('');
const modalDate = ref('');
const modalType = ref<LogType>('TIME_OUT');

onMounted(async () => {
  await employeeStore.loadEmployees();
  await attendanceStore.loadLogs();
});

// Compute Paired Shifts across all employees
const allPairedShifts = computed(() => {
  const list: PairedShift[] = [];

  for (const emp of employeeStore.employees) {
    if (selectedEmployeeId.value !== 'ALL' && emp.id !== selectedEmployeeId.value) {
      continue;
    }
    const empLogs = attendanceStore.logs.filter((l) => l.employeeId === emp.id);
    const pairs = pairEmployeeShifts(emp, empLogs);
    list.push(...pairs);
  }

  // Sort descending by shift date
  return list.sort((a, b) => b.shiftDate.localeCompare(a.shiftDate));
});

// Filtered paired shifts based on status
const filteredPairedShifts = computed(() => {
  return allPairedShifts.value.filter((shift) => {
    if (filterStatus.value === 'ALL') return true;
    if (filterStatus.value === 'unpaired') {
      return shift.status === 'missing_out' || shift.status === 'missing_in';
    }
    if (filterStatus.value === 'crossover') {
      return shift.isMidnightCrossover;
    }
    if (filterStatus.value === 'manual') {
      return shift.status === 'manual_adjusted';
    }
    return true;
  });
});

// Count of unpaired missed punches
const totalUnpairedCount = computed(() => {
  return allPairedShifts.value.filter(
    (s) => s.status === 'missing_out' || s.status === 'missing_in'
  ).length;
});

function openNewManualPunch() {
  modalEmployeeId.value = employeeStore.employees[0]?.id || '';
  modalDate.value = new Date().toISOString().slice(0, 10);
  modalType.value = 'TIME_OUT';
  isManualModalOpen.value = true;
}

function resolveMissedPunch(shift: PairedShift) {
  modalEmployeeId.value = shift.employeeId;
  modalDate.value = shift.shiftDate;
  modalType.value = shift.status === 'missing_out' ? 'TIME_OUT' : 'TIME_IN';
  isManualModalOpen.value = true;
}

async function handleDeleteLog(id: string) {
  if (confirm('Are you sure you want to delete this punch log? This will affect payroll calculation.')) {
    await attendanceStore.deletePunch(id);
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <CalendarCheck class="w-6 h-6 text-emerald-400" />
          <span>Attendance Logs & Punch Adjustments</span>
        </h1>
        <p class="text-xs text-slate-400 mt-1">
          Review daily punch pairing, resolve missed punches, and inspect midnight crossovers
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="openNewManualPunch"
          class="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <Plus class="w-4 h-4" />
          <span>Add Manual Punch Override</span>
        </button>
      </div>
    </div>

    <!-- MISSED PUNCHES WARNING BANNER -->
    <div
      v-if="totalUnpairedCount > 0"
      class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start sm:items-center justify-between gap-4"
    >
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-amber-500/20 text-amber-400">
          <AlertTriangle class="w-5 h-5" />
        </div>
        <div>
          <div class="text-sm font-bold text-amber-300">
            {{ totalUnpairedCount }} Missed / Unpaired Punch(es) Detected
          </div>
          <p class="text-xs text-amber-300/80">
            Staff forgot to clock out or clock in. Please approve a manual end time to ensure accurate payroll calculation.
          </p>
        </div>
      </div>

      <button
        @click="filterStatus = 'unpaired'"
        class="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-amber-400 transition shrink-0"
      >
        Filter Missed Punches
      </button>
    </div>

    <!-- TABS AND FILTERS -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
      <!-- Mode Tabs -->
      <div class="flex items-center gap-1.5">
        <button
          @click="activeTab = 'pairs'"
          class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition"
          :class="activeTab === 'pairs' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'"
        >
          Paired Shifts & Audit (Recommended)
        </button>
        <button
          @click="activeTab = 'raw'"
          class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition"
          :class="activeTab === 'raw' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'"
        >
          Raw Kiosk Logs Journal
        </button>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-2">
        <select
          v-model="selectedEmployeeId"
          class="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">All Employees</option>
          <option v-for="emp in employeeStore.employees" :key="emp.id" :value="emp.id">
            {{ emp.id }} - {{ emp.fullName }}
          </option>
        </select>

        <select
          v-if="activeTab === 'pairs'"
          v-model="filterStatus"
          class="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">All Shift Types</option>
          <option value="unpaired">⚠️ Unpaired / Missed Punches</option>
          <option value="crossover">🌙 Midnight Crossovers</option>
          <option value="manual">✏️ Supervisor Overrides</option>
        </select>
      </div>
    </div>

    <!-- TAB 1: PAIRED SHIFTS & AUDIT VIEW -->
    <div v-if="activeTab === 'pairs'" class="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase tracking-wider font-semibold">
              <th class="p-4">Shift Date</th>
              <th class="p-4">Worker</th>
              <th class="p-4">Time In</th>
              <th class="p-4">Time Out</th>
              <th class="p-4">Rendered</th>
              <th class="p-4">Tardiness / Status</th>
              <th class="p-4 text-right">Adjustment Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            <tr
              v-for="shift in filteredPairedShifts"
              :key="shift.id"
              class="hover:bg-slate-800/40 transition"
              :class="{
                'bg-amber-500/5': shift.status === 'missing_out' || shift.status === 'missing_in',
                'bg-indigo-500/5': shift.isMidnightCrossover
              }"
            >
              <!-- Shift Date -->
              <td class="p-4 font-mono font-bold text-slate-200">
                {{ shift.shiftDate }}
              </td>

              <!-- Worker -->
              <td class="p-4">
                <div class="font-bold text-white">
                  {{ employeeStore.getEmployeeById(shift.employeeId)?.fullName || shift.employeeId }}
                </div>
                <div class="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <span>{{ shift.employeeId }}</span>
                  <span>•</span>
                  <span class="capitalize">{{ employeeStore.getEmployeeById(shift.employeeId)?.shiftType }}</span>
                </div>
              </td>

              <!-- Time In -->
              <td class="p-4">
                <div v-if="shift.timeInLog">
                  <span class="font-mono font-bold text-emerald-400">
                    {{ new Date(shift.timeInLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
                  </span>
                  <span v-if="shift.timeInLog.manualOverride" class="block text-[9px] text-amber-400">
                    Manual Override
                  </span>
                </div>
                <div v-else>
                  <span class="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold font-mono text-[10px] border border-red-500/30">
                    MISSING IN
                  </span>
                </div>
              </td>

              <!-- Time Out -->
              <td class="p-4">
                <div v-if="shift.timeOutLog">
                  <span class="font-mono font-bold text-amber-400">
                    {{ new Date(shift.timeOutLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
                  </span>
                  <!-- Midnight Crossover Tag -->
                  <span v-if="shift.isMidnightCrossover" class="inline-flex items-center gap-1 text-[10px] text-indigo-400 font-semibold block mt-0.5">
                    <Moon class="w-3 h-3" />
                    <span>Next Morning (+1d)</span>
                  </span>
                  <span v-if="shift.timeOutLog.manualOverride" class="block text-[9px] text-amber-400">
                    Manual Override
                  </span>
                </div>
                <div v-else>
                  <span class="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold font-mono text-[10px] border border-red-500/30">
                    MISSING OUT
                  </span>
                </div>
              </td>

              <!-- Rendered Hours -->
              <td class="p-4">
                <span class="font-mono font-bold text-white text-sm">
                  {{ shift.hoursWorked }} hrs
                </span>
              </td>

              <!-- Tardiness / Badges -->
              <td class="p-4 space-y-1">
                <!-- Status Badges -->
                <div v-if="shift.status === 'missing_out'" class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  <AlertTriangle class="w-3 h-3" />
                  <span>Unpaired (No Clock-Out)</span>
                </div>

                <div v-else-if="shift.status === 'missing_in'" class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  <AlertTriangle class="w-3 h-3" />
                  <span>Unpaired (No Clock-In)</span>
                </div>

                <div v-else class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                  <CheckCircle2 class="w-3 h-3" />
                  <span>Shift Paired</span>
                </div>

                <div v-if="shift.lateMinutes > 0" class="text-[10px] text-amber-400 font-mono block">
                  Tardy: {{ shift.lateMinutes }} mins late
                </div>
              </td>

              <!-- Actions -->
              <td class="p-4 text-right">
                <button
                  v-if="shift.status === 'missing_out' || shift.status === 'missing_in'"
                  @click="resolveMissedPunch(shift)"
                  class="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition flex items-center gap-1 ml-auto shadow-sm"
                >
                  <Edit class="w-3 h-3" />
                  <span>Approve Punch</span>
                </button>
                <span v-else class="text-slate-500 text-[11px] font-medium">
                  Verified
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 2: RAW KIOSK LOGS JOURNAL -->
    <div v-else class="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase tracking-wider font-semibold">
              <th class="p-4">Log ID</th>
              <th class="p-4">Worker</th>
              <th class="p-4">Punch Type</th>
              <th class="p-4">Timestamp (ISO)</th>
              <th class="p-4">Source / Device</th>
              <th class="p-4">Sync Status</th>
              <th class="p-4">Supervisor Notes</th>
              <th class="p-4 text-right">Delete</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            <tr
              v-for="log in attendanceStore.logs"
              :key="log.id"
              class="hover:bg-slate-800/40 transition"
            >
              <td class="p-4 font-mono text-[10px] text-slate-400">{{ log.id }}</td>
              <td class="p-4">
                <span class="font-bold text-white block">{{ employeeStore.getEmployeeById(log.employeeId)?.fullName || log.employeeId }}</span>
                <span class="text-[10px] text-slate-400 font-mono">{{ log.employeeId }}</span>
              </td>
              <td class="p-4">
                <span
                  class="px-2 py-0.5 rounded font-mono font-bold text-[10px]"
                  :class="log.logType === 'TIME_IN' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'"
                >
                  {{ log.logType }}
                </span>
              </td>
              <td class="p-4 font-mono text-slate-300">{{ new Date(log.timestamp).toLocaleString() }}</td>
              <td class="p-4 text-slate-400 font-mono text-[10px]">{{ log.deviceId }}</td>
              <td class="p-4">
                <span
                  class="px-2 py-0.5 rounded text-[10px] font-semibold"
                  :class="log.synced ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'"
                >
                  {{ log.synced ? 'Cloud Synced' : 'Queued Locally' }}
                </span>
              </td>
              <td class="p-4 text-slate-400 text-[11px] max-w-[200px] truncate">
                {{ log.supervisorNote || '—' }}
              </td>
              <td class="p-4 text-right">
                <button
                  @click="handleDeleteLog(log.id)"
                  class="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                  title="Delete log entry"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Manual Punch Override Modal -->
    <ManualPunchModal
      :is-open="isManualModalOpen"
      :initial-employee-id="modalEmployeeId"
      :initial-date="modalDate"
      :initial-type="modalType"
      @close="isManualModalOpen = false"
      @saved="attendanceStore.loadLogs"
    />
  </div>
</template>
