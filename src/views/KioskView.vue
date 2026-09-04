<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAttendanceStore } from '../stores/attendanceStore';
import { useEmployeeStore } from '../stores/employeeStore';
import { parseAndVerifyQrToken } from '../services/crypto';
import { scannerService } from '../services/scanner';
import { soundService } from '../services/audio';
import type { LogType } from '../types';
import ConfirmationCard from '../components/ConfirmationCard.vue';
import {
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  Lock,
  Camera,
  QrCode,
  ShieldCheck,
  AlertCircle,
  Maximize2
} from 'lucide-vue-next';

const router = useRouter();
const attendanceStore = useAttendanceStore();
const employeeStore = useEmployeeStore();

// Selected punch mode: 'TIME_IN' or 'TIME_OUT'
const selectedMode = ref<LogType>('TIME_IN');

// Real-time clock
const currentTime = ref('');
const currentSeconds = ref('');
const currentPeriod = ref('');
const currentDate = ref('');
let clockTimer: NodeJS.Timeout | null = null;

// Scanner state
const isCameraActive = ref(false);
const scannerError = ref('');
const isProcessingScan = ref(false);
const testEmployeeId = ref('');

function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  currentTime.value = `${String(hours).padStart(2, '0')}:${minutes}`;
  currentSeconds.value = seconds;
  currentPeriod.value = period;

  currentDate.value = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

onMounted(async () => {
  attendanceStore.initNetworkListeners();
  await employeeStore.loadEmployees();
  await attendanceStore.loadLogs();

  if (employeeStore.employees.length > 0) {
    testEmployeeId.value = employeeStore.employees[0].id;
  }

  updateClock();
  clockTimer = setInterval(updateClock, 1000);

  // Initialize camera scanner
  initScanner();
});

onUnmounted(async () => {
  if (clockTimer) clearInterval(clockTimer);
  await scannerService.stopAll();
});

async function initScanner() {
  scannerError.value = '';
  try {
    if (scannerService.isNative()) {
      await scannerService.startNativeScanner((text) => handleScanResult(text));
      isCameraActive.value = true;
    } else {
      // Browser camera using html5-qrcode
      await scannerService.startWebScanner('kiosk-scanner-reader', (text) => handleScanResult(text));
      isCameraActive.value = true;
    }
  } catch (err: unknown) {
    console.warn('Camera failed to start:', err);
    scannerError.value = 'Camera preview unavailable. You can use the Quick Test Scanner Simulator below.';
    isCameraActive.value = false;
  }
}

async function handleScanResult(rawScannedText: string) {
  if (isProcessingScan.value) return;

  const result = parseAndVerifyQrToken(rawScannedText);
  if (!result.success || !result.employeeId) {
    soundService.playErrorBuzzer();
    scannerError.value = result.error || 'Invalid QR code scanned.';
    setTimeout(() => {
      scannerError.value = '';
    }, 2500);
    return;
  }

  const employee = employeeStore.getEmployeeById(result.employeeId);
  if (!employee) {
    soundService.playErrorBuzzer();
    scannerError.value = `Employee "${result.employeeId}" not found in active roster.`;
    setTimeout(() => {
      scannerError.value = '';
    }, 2500);
    return;
  }

  isProcessingScan.value = true;
  try {
    const outcome = await attendanceStore.recordPunch(employee, selectedMode.value);
    if (!outcome.success) {
      scannerError.value = outcome.message;
      setTimeout(() => {
        scannerError.value = '';
      }, 3000);
    }
  } finally {
    // Release processing lock after brief moment
    setTimeout(() => {
      isProcessingScan.value = false;
    }, 1000);
  }
}

// Quick Simulator: for testing without physical camera / headless env
function triggerSimulatorScan() {
  if (!testEmployeeId.value) return;
  handleScanResult(testEmployeeId.value);
}

function toggleOfflineSimulation() {
  attendanceStore.simulateOfflineMode = !attendanceStore.simulateOfflineMode;
  if (!attendanceStore.simulateOfflineMode) {
    attendanceStore.syncPendingLogs();
  }
}

function triggerManualSync() {
  attendanceStore.syncPendingLogs();
}

function goToAdmin() {
  router.push('/admin');
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-6 select-none overflow-hidden font-sans">
    <!-- TOP STATUS BAR (Landscape Tablet Optimized) -->
    <header class="flex items-center justify-between pb-3 border-b border-slate-800/80">
      <!-- Brand & Mode Title -->
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black shadow-lg shadow-emerald-500/10">
          K
        </div>
        <div>
          <h1 class="text-lg font-black tracking-tight flex items-center gap-2">
            <span>KEGAMA ATTENDANCE</span>
            <span class="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-mono text-slate-300 font-semibold uppercase">
              Tablet Kiosk
            </span>
          </h1>
          <p class="text-xs text-slate-400">Automated Employee Time Recorder</p>
        </div>
      </div>

      <!-- Center Clock -->
      <div class="flex items-baseline gap-2 bg-slate-900/90 border border-slate-800 px-5 py-2 rounded-2xl shadow-inner">
        <Clock class="w-4 h-4 text-emerald-400 self-center" />
        <span class="text-2xl md:text-3xl font-black font-mono tracking-tight text-white">{{ currentTime }}</span>
        <span class="text-xs font-mono font-bold text-emerald-400">:{{ currentSeconds }}</span>
        <span class="text-xs font-bold text-slate-400">{{ currentPeriod }}</span>
        <span class="text-slate-600 px-1">|</span>
        <span class="text-xs font-medium text-slate-300">{{ currentDate }}</span>
      </div>

      <!-- Connectivity & Portal Switch -->
      <div class="flex items-center gap-2.5">
        <!-- Offline Sync Indicator -->
        <div
          class="px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer transition"
          :class="attendanceStore.isEffectivelyOnline
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-amber-500/15 border-amber-500/30 text-amber-300'"
          @click="toggleOfflineSimulation"
          :title="attendanceStore.isEffectivelyOnline ? 'Online (Click to simulate offline)' : 'Offline mode active (Click to reconnect)'"
        >
          <Wifi v-if="attendanceStore.isEffectivelyOnline" class="w-3.5 h-3.5 text-emerald-400" />
          <WifiOff v-else class="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>{{ attendanceStore.isEffectivelyOnline ? 'Online Synced' : `Offline (${attendanceStore.pendingSyncCount} queued)` }}</span>
        </div>

        <button
          v-if="attendanceStore.pendingSyncCount > 0"
          @click="triggerManualSync"
          :disabled="attendanceStore.isSyncing"
          class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          title="Force Cloud Sync"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': attendanceStore.isSyncing }" />
        </button>

        <button
          @click="toggleFullScreen"
          class="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title="Toggle Fullscreen"
        >
          <Maximize2 class="w-4 h-4" />
        </button>

        <!-- Admin Portal Mode Switch -->
        <button
          @click="goToAdmin"
          class="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-500 text-xs font-bold text-slate-300 hover:text-white transition flex items-center gap-1.5 shadow-sm"
        >
          <Lock class="w-3.5 h-3.5 text-emerald-400" />
          <span>Admin Portal</span>
        </button>
      </div>
    </header>

    <!-- MAIN SCANNER LANDSCAPE WORKSPACE (Split Grid) -->
    <main class="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 my-4 items-center">
      <!-- LEFT PUNCH CONTROLS & CAMERA VIEWFINDER (7 cols) -->
      <section class="md:col-span-7 flex flex-col h-full justify-between">
        <!-- BIG TOGGLE BUTTONS (TIME IN vs TIME OUT) -->
        <div class="grid grid-cols-2 gap-4 mb-4">
          <button
            type="button"
            @click="selectedMode = 'TIME_IN'"
            class="py-4 px-6 rounded-2xl font-black text-lg md:text-xl border-2 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-98"
            :class="selectedMode === 'TIME_IN'
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 border-emerald-300 text-white shadow-emerald-500/25 ring-4 ring-emerald-500/30'
              : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'"
          >
            <span class="w-4 h-4 rounded-full bg-emerald-300" :class="{ 'animate-ping': selectedMode === 'TIME_IN' }"></span>
            <span>TIME IN (CLOCK IN)</span>
          </button>

          <button
            type="button"
            @click="selectedMode = 'TIME_OUT'"
            class="py-4 px-6 rounded-2xl font-black text-lg md:text-xl border-2 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-98"
            :class="selectedMode === 'TIME_OUT'
              ? 'bg-gradient-to-r from-amber-600 to-amber-500 border-amber-300 text-white shadow-amber-500/25 ring-4 ring-amber-500/30'
              : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'"
          >
            <span class="w-4 h-4 rounded-full bg-amber-300" :class="{ 'animate-ping': selectedMode === 'TIME_OUT' }"></span>
            <span>TIME OUT (CLOCK OUT)</span>
          </button>
        </div>

        <!-- CAMERA SCANNER VIEWFINDER BOX -->
        <div class="relative flex-1 min-h-[300px] md:min-h-[360px] bg-slate-950 rounded-3xl border-2 border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl">
          <!-- Live Camera Video Container for html5-qrcode -->
          <div id="kiosk-scanner-reader" class="w-full h-full object-cover"></div>

          <!-- Scanning Overlay Reticle -->
          <div class="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <!-- Center Target Box -->
            <div class="w-64 h-64 border-2 border-dashed border-emerald-400/70 rounded-3xl relative flex items-center justify-center backdrop-blur-[1px]">
              <!-- Corner Brackets -->
              <div class="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
              <div class="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
              <div class="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
              <div class="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>

              <!-- Animated Laser Scanning Line -->
              <div class="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-scan-sweep"></div>
            </div>

            <p class="mt-4 px-4 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-full text-xs font-semibold text-slate-300 border border-slate-700/80 flex items-center gap-2">
              <Camera class="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Align Employee QR Pass inside the frame</span>
            </p>
          </div>

          <!-- Scanner Feedback / Error Banner -->
          <div
            v-if="scannerError"
            class="absolute top-4 inset-x-4 p-3 bg-red-500/90 backdrop-blur-md border border-red-400 rounded-2xl text-xs font-bold text-white flex items-center gap-2 shadow-lg animate-fadeIn"
          >
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{{ scannerError }}</span>
          </div>
        </div>
      </section>

      <!-- RIGHT SIDE: QUICK TEST SIMULATOR & RECENT FEED (5 cols) -->
      <section class="md:col-span-5 flex flex-col h-full justify-between gap-4">
        <!-- QUICK TEST SCANNER SIMULATOR (Instant Demo & Headless Support) -->
        <div class="p-5 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <QrCode class="w-4 h-4 text-emerald-400" />
              <h2 class="text-sm font-bold text-white">Quick QR Scan Simulator</h2>
            </div>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Demo / Test Mode
            </span>
          </div>

          <p class="text-xs text-slate-400 mb-3">
            Select any registered worker below to simulate an instant barcode/QR badge swipe:
          </p>

          <div class="space-y-3">
            <select
              v-model="testEmployeeId"
              class="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option
                v-for="emp in employeeStore.employees"
                :key="emp.id"
                :value="emp.id"
              >
                {{ emp.id }} — {{ emp.fullName }} ({{ emp.shiftType === 'night' ? '🌙 Night Shift' : '☀️ Regular Shift' }})
              </option>
            </select>

            <button
              type="button"
              @click="triggerSimulatorScan"
              :disabled="isProcessingScan"
              class="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-98 disabled:opacity-50"
              :class="selectedMode === 'TIME_IN'
                ? 'bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20'
                : 'bg-amber-400 hover:bg-amber-300 shadow-amber-500/20'"
            >
              <ShieldCheck class="w-4 h-4" />
              <span>Simulate Badge Scan ({{ selectedMode }})</span>
            </button>
          </div>

          <div class="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>3-second debounce active</span>
            <span class="font-mono text-emerald-400">Audio/Vibe Enabled</span>
          </div>
        </div>

        <!-- RECENT ON-SCREEN PUNCH FEED -->
        <div class="flex-1 bg-slate-900/60 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between overflow-hidden">
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Kiosk Activity</span>
            <span class="text-[11px] text-slate-400 font-mono">{{ attendanceStore.logs.length }} total logs</span>
          </div>

          <div class="space-y-2 my-2 overflow-y-auto max-h-[160px] pr-1">
            <div
              v-for="log in attendanceStore.logs.slice(0, 4)"
              :key="log.id"
              class="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs"
            >
              <div class="flex items-center gap-2">
                <span
                  class="w-2 h-2 rounded-full"
                  :class="log.logType === 'TIME_IN' ? 'bg-emerald-400' : 'bg-amber-400'"
                ></span>
                <div>
                  <span class="font-bold text-white block">
                    {{ employeeStore.getEmployeeById(log.employeeId)?.fullName || log.employeeId }}
                  </span>
                  <span class="text-[10px] text-slate-400 font-mono">{{ log.employeeId }}</span>
                </div>
              </div>

              <div class="text-right">
                <span
                  class="font-bold font-mono px-2 py-0.5 rounded text-[10px]"
                  :class="log.logType === 'TIME_IN' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'"
                >
                  {{ log.logType }}
                </span>
                <span class="block text-[10px] text-slate-400 font-mono mt-0.5">
                  {{ new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}
                </span>
              </div>
            </div>

            <div v-if="attendanceStore.logs.length === 0" class="text-center py-6 text-slate-400 text-xs">
              No recent punches recorded on this kiosk.
            </div>
          </div>

          <div class="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              IndexedDB local storage active
            </span>
            <span class="font-mono">Kiosk v2.6.4</span>
          </div>
        </div>
      </section>
    </main>

    <!-- FOOTER HELPER BAR -->
    <footer class="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
      <div class="flex items-center gap-3">
        <span>Hardware Kiosk Viewport: Locked Landscape</span>
        <span>•</span>
        <span>Camera & Sound Sensors: Active</span>
      </div>
      <div class="flex items-center gap-2">
        <span>Tap [Admin Portal] above to manage roster & run semi-monthly payroll</span>
      </div>
    </footer>

    <!-- VISUAL CONFIRMATION CARD OVERLAY (Appears for 3 seconds on successful scan) -->
    <ConfirmationCard
      v-if="attendanceStore.confirmationModal"
      :data="attendanceStore.confirmationModal"
      @dismiss="attendanceStore.dismissConfirmation"
    />
  </div>
</template>

<style scoped>
@keyframes scanSweep {
  0% { transform: translateY(-110px); }
  50% { transform: translateY(110px); }
  100% { transform: translateY(-110px); }
}

.animate-scan-sweep {
  animation: scanSweep 2.4s ease-in-out infinite;
}
</style>
