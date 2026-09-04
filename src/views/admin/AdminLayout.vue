<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/authStore';
import { useAttendanceStore } from '../../stores/attendanceStore';
import {
  LayoutDashboard,
  Users,
  QrCode,
  CalendarCheck,
  Calculator,
  Tablet,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const attendanceStore = useAttendanceStore();

const navItems = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
  { name: 'Employee Roster', path: '/admin/employees', icon: Users },
  { name: 'QR Pass Generator', path: '/admin/qr-passes', icon: QrCode },
  { name: 'Attendance & Adjustments', path: '/admin/attendance', icon: CalendarCheck },
  { name: 'Semi-Monthly Payroll', path: '/admin/payroll', icon: Calculator },
];

function isCurrentRoute(item: typeof navItems[0]) {
  if (item.exact) {
    return route.path === item.path;
  }
  return route.path.startsWith(item.path);
}

function returnToKiosk() {
  router.push('/kiosk');
}

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
    <!-- SIDEBAR NAVIGATION -->
    <aside class="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
      <div>
        <!-- Brand Header -->
        <div class="p-5 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black">
              K
            </div>
            <div>
              <div class="font-extrabold text-white text-base tracking-tight">KEGAMA</div>
              <div class="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Payroll Portal</div>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            v2.6
          </span>
        </div>

        <!-- Navigation Links -->
        <nav class="p-3 space-y-1">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition group"
            :class="isCurrentRoute(item)
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/80'"
          >
            <component :is="item.icon" class="w-4 h-4 shrink-0" />
            <span>{{ item.name }}</span>
          </router-link>
        </nav>
      </div>

      <!-- Bottom Sidebar Profile & Operational Mode Switch -->
      <div class="p-4 border-t border-slate-800 space-y-3">
        <!-- Switch to Kiosk Mode Button (Very prominent!) -->
        <button
          @click="returnToKiosk"
          class="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
        >
          <Tablet class="w-4 h-4" />
          <span>Switch to Tablet Kiosk</span>
        </button>

        <!-- Connectivity & Offline Sync -->
        <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Wifi v-if="attendanceStore.isEffectivelyOnline" class="w-3.5 h-3.5 text-emerald-400" />
            <WifiOff v-else class="w-3.5 h-3.5 text-amber-400" />
            <span class="text-slate-300">{{ attendanceStore.isEffectivelyOnline ? 'Online' : 'Offline' }}</span>
          </div>

          <button
            v-if="attendanceStore.pendingSyncCount > 0"
            @click="attendanceStore.syncPendingLogs"
            :disabled="attendanceStore.isSyncing"
            class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold flex items-center gap-1"
          >
            <RefreshCw class="w-3 h-3" :class="{ 'animate-spin': attendanceStore.isSyncing }" />
            <span>Sync {{ attendanceStore.pendingSyncCount }}</span>
          </button>
        </div>

        <!-- Supervisor Info & Sign Out -->
        <div class="flex items-center justify-between pt-1">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
              S
            </div>
            <div class="text-xs">
              <div class="font-bold text-white leading-tight">Supervisor</div>
              <div class="text-[10px] text-slate-400">Admin Mode</div>
            </div>
          </div>

          <button
            @click="handleLogout"
            class="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
            title="Lock Portal"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- MAIN CONTENT AREA -->
    <div class="flex-1 flex flex-col min-w-0 bg-slate-950">
      <main class="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
        <router-view />
      </main>
    </div>
  </div>
</template>
