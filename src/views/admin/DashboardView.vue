<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useEmployeeStore } from '../../stores/employeeStore';
import { useAttendanceStore } from '../../stores/attendanceStore';
import { pairEmployeeShifts } from '../../services/payrollEngine';
import {
  Users,
  UserCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  QrCode,
  Calculator,
  ShieldCheck
} from 'lucide-vue-next';

const router = useRouter();
const employeeStore = useEmployeeStore();
const attendanceStore = useAttendanceStore();

onMounted(async () => {
  await employeeStore.loadEmployees();
  await attendanceStore.loadLogs();
});

// Compute active staff on-site (clocked in today whose latest punch is TIME_IN)
const activeStaffOnSite = computed(() => {
  const activeIds = new Set<string>();

  for (const emp of employeeStore.employees) {
    const empLogs = attendanceStore.logs
      .filter((l) => l.employeeId === emp.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (empLogs.length > 0 && empLogs[0].logType === 'TIME_IN') {
      activeIds.add(emp.id);
    }
  }

  return activeIds.size;
});

// Compute missed punches across active employees
const missedPunchesCount = computed(() => {
  let count = 0;
  for (const emp of employeeStore.employees) {
    const empLogs = attendanceStore.logs.filter((l) => l.employeeId === emp.id);
    const pairs = pairEmployeeShifts(emp, empLogs);
    count += pairs.filter((p) => p.status === 'missing_out' || p.status === 'missing_in').length;
  }
  return count;
});

const recentLogs = computed(() => {
  return attendanceStore.logs.slice(0, 6);
});
</script>

<template>
  <div class="space-y-8">
    <!-- Header Banner -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl md:text-3xl font-black text-white tracking-tight">Operations Dashboard</h1>
        <p class="text-sm text-slate-400 mt-1">Real-time attendance telemetry, missed punch tracking & payroll readiness</p>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-3">
        <button
          @click="router.push('/admin/attendance')"
          class="px-4 py-2.5 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl text-xs font-bold text-slate-200 transition flex items-center gap-2"
        >
          <Clock class="w-4 h-4 text-emerald-400" />
          <span>Punch Adjustments</span>
        </button>

        <button
          @click="router.push('/admin/payroll')"
          class="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <Calculator class="w-4 h-4" />
          <span>Compile Cutoff Payroll</span>
        </button>
      </div>
    </div>

    <!-- METRICS CARDS GRID -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <!-- Card 1: Total Employees -->
      <div class="p-5 bg-slate-900/90 border border-slate-800 rounded-3xl relative overflow-hidden shadow-lg">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Workforce</span>
          <div class="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Users class="w-5 h-5" />
          </div>
        </div>
        <div class="text-3xl font-black font-mono text-white mt-3">{{ employeeStore.employees.length }}</div>
        <div class="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
          <span class="text-emerald-400 font-semibold">{{ employeeStore.employees.filter(e => e.status === 'active').length }} active</span>
          <span>registered on roster</span>
        </div>
      </div>

      <!-- Card 2: Active Staff On-Site -->
      <div class="p-5 bg-slate-900/90 border border-slate-800 rounded-3xl relative overflow-hidden shadow-lg">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Clocked In Now</span>
          <div class="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <UserCheck class="w-5 h-5" />
          </div>
        </div>
        <div class="text-3xl font-black font-mono text-emerald-400 mt-3">{{ activeStaffOnSite }}</div>
        <div class="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Personnel physically on shift</span>
        </div>
      </div>

      <!-- Card 3: Missed / Unpaired Punches -->
      <div
        class="p-5 bg-slate-900/90 border rounded-3xl relative overflow-hidden shadow-lg cursor-pointer transition hover:border-amber-500/50"
        :class="missedPunchesCount > 0 ? 'border-amber-500/30' : 'border-slate-800'"
        @click="router.push('/admin/attendance')"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Missed Punches</span>
          <div class="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle class="w-5 h-5" />
          </div>
        </div>
        <div class="text-3xl font-black font-mono text-amber-400 mt-3">{{ missedPunchesCount }}</div>
        <div class="text-xs text-amber-300/80 mt-1 flex items-center gap-1">
          <span>Requires supervisor manual override</span>
          <ArrowRight class="w-3 h-3 ml-auto" />
        </div>
      </div>

      <!-- Card 4: Offline Queue Status -->
      <div class="p-5 bg-slate-900/90 border border-slate-800 rounded-3xl relative overflow-hidden shadow-lg">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Device Memory Sync</span>
          <div class="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <ShieldCheck class="w-5 h-5" />
          </div>
        </div>
        <div class="text-3xl font-black font-mono text-white mt-3">{{ attendanceStore.pendingSyncCount }}</div>
        <div class="text-xs text-slate-400 mt-1">
          <span v-if="attendanceStore.pendingSyncCount === 0" class="text-emerald-400 font-semibold">All local logs synced</span>
          <span v-else class="text-amber-400 font-semibold">Punches queued locally in IndexedDB</span>
        </div>
      </div>
    </div>

    <!-- RECENT ACTIVITY & QUICK ACTIONS ROW -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Recent Live Punch Stream (2 cols) -->
      <div class="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div class="flex items-center justify-between mb-5">
          <div>
            <h2 class="text-base font-bold text-white">Live Attendance Stream</h2>
            <p class="text-xs text-slate-400">Chronological feed of kiosk badge scans</p>
          </div>

          <button
            @click="router.push('/admin/attendance')"
            class="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
          >
            <span>View All Logs</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th class="pb-3 font-semibold">Worker</th>
                <th class="pb-3 font-semibold">Punch Type</th>
                <th class="pb-3 font-semibold">Exact Timestamp</th>
                <th class="pb-3 font-semibold">Device</th>
                <th class="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              <tr
                v-for="log in recentLogs"
                :key="log.id"
                class="hover:bg-slate-800/40 transition"
              >
                <td class="py-3 font-medium text-white flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400">
                    {{ (employeeStore.getEmployeeById(log.employeeId)?.fullName || log.employeeId).charAt(0) }}
                  </div>
                  <div>
                    <span class="block font-bold">{{ employeeStore.getEmployeeById(log.employeeId)?.fullName || log.employeeId }}</span>
                    <span class="text-[10px] text-slate-400 font-mono">{{ log.employeeId }}</span>
                  </div>
                </td>
                <td class="py-3">
                  <span
                    class="px-2.5 py-1 rounded-md font-bold font-mono text-[10px]"
                    :class="log.logType === 'TIME_IN' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'"
                  >
                    {{ log.logType }}
                  </span>
                </td>
                <td class="py-3 font-mono text-slate-300">
                  {{ new Date(log.timestamp).toLocaleString() }}
                </td>
                <td class="py-3 text-slate-400 font-mono text-[11px]">
                  {{ log.deviceId }}
                </td>
                <td class="py-3">
                  <span
                    v-if="log.manualOverride"
                    class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold"
                  >
                    Supervisor Override
                  </span>
                  <span
                    v-else
                    class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]"
                  >
                    Auto Scan
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Quick Portal Tools (1 col) -->
      <div class="space-y-4">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 class="text-base font-bold text-white">Management Shortcuts</h2>

          <button
            @click="router.push('/admin/employees')"
            class="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition flex items-center justify-between text-left group"
          >
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Users class="w-5 h-5" />
              </div>
              <div>
                <div class="text-sm font-bold text-white group-hover:text-emerald-400 transition">Manage Roster</div>
                <div class="text-xs text-slate-400">Add or edit wage rates & shares</div>
              </div>
            </div>
            <ArrowRight class="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
          </button>

          <button
            @click="router.push('/admin/qr-passes')"
            class="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition flex items-center justify-between text-left group"
          >
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <QrCode class="w-5 h-5" />
              </div>
              <div>
                <div class="text-sm font-bold text-white group-hover:text-emerald-400 transition">Export QR Badges</div>
                <div class="text-xs text-slate-400">Generate encrypted ID passes</div>
              </div>
            </div>
            <ArrowRight class="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
          </button>

          <button
            @click="router.push('/admin/payroll')"
            class="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition flex items-center justify-between text-left group"
          >
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Calculator class="w-5 h-5" />
              </div>
              <div>
                <div class="text-sm font-bold text-white group-hover:text-emerald-400 transition">Payroll Calculator</div>
                <div class="text-xs text-slate-400">Tally hours & download payslips</div>
              </div>
            </div>
            <ArrowRight class="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
