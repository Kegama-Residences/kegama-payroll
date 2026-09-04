<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useEmployeeStore } from '../../stores/employeeStore';
import { generateEncryptedQrToken } from '../../services/crypto';
import QrBadgeCard from '../../components/QrBadgeCard.vue';
import { QrCode, Printer, ShieldCheck, Sparkles } from 'lucide-vue-next';

const route = useRoute();
const employeeStore = useEmployeeStore();

const selectedEmployeeId = ref('');
const isBatchPrintMode = ref(false);

onMounted(async () => {
  await employeeStore.loadEmployees();

  const queryEmp = route.query.emp as string;
  if (queryEmp && employeeStore.getEmployeeById(queryEmp)) {
    selectedEmployeeId.value = queryEmp;
  } else if (employeeStore.employees.length > 0) {
    selectedEmployeeId.value = employeeStore.employees[0].id;
  }
});

const selectedEmployee = computed(() => {
  return employeeStore.getEmployeeById(selectedEmployeeId.value);
});

const currentEncryptedToken = computed(() => {
  if (!selectedEmployee.value) return '';
  return generateEncryptedQrToken(selectedEmployee.value);
});

function printAllBadges() {
  isBatchPrintMode.value = true;
  setTimeout(() => {
    window.print();
  }, 300);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <QrCode class="w-6 h-6 text-emerald-400" />
          <span>Digital QR Pass & Badge Generator</span>
        </h1>
        <p class="text-xs text-slate-400 mt-1">
          Cryptographically signed pass tokens paired with employee records for kiosk swiping
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="printAllBadges"
          class="px-4 py-2.5 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-2"
        >
          <Printer class="w-4 h-4 text-sky-400" />
          <span>Batch Print All Badges</span>
        </button>
      </div>
    </div>

    <!-- Batch Print View (When printing all) -->
    <div v-if="isBatchPrintMode" class="print-only grid grid-cols-2 gap-6 p-4 bg-white">
      <div
        v-for="emp in employeeStore.employees"
        :key="emp.id"
        class="page-break-inside-avoid"
      >
        <QrBadgeCard :employee="emp" />
      </div>
    </div>

    <!-- Normal Interactive Single Pass Inspector -->
    <div class="no-print grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- LEFT: Employee Selector & Cryptographic Token Info (7 cols) -->
      <div class="lg:col-span-7 space-y-5">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400">
            Select Employee to Generate Pass
          </label>

          <select
            v-model="selectedEmployeeId"
            class="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white text-sm focus:outline-none focus:border-emerald-500 font-semibold"
          >
            <option
              v-for="emp in employeeStore.employees"
              :key="emp.id"
              :value="emp.id"
            >
              {{ emp.id }} — {{ emp.fullName }} ({{ emp.jobTitle }})
            </option>
          </select>

          <!-- Security Details Box -->
          <div v-if="selectedEmployee" class="p-5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck class="w-4 h-4 text-emerald-400" />
                <span>Anti-Tamper Token Security</span>
              </span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Salted HMAC Hash
              </span>
            </div>

            <p class="text-[11px] text-slate-400">
              Each QR pass contains a cryptographically signed payload incorporating the worker's unique identifier and an internal checksum. The kiosk scanner automatically verifies this payload upon camera detection.
            </p>

            <div class="space-y-1 pt-2 border-t border-slate-800 text-[11px]">
              <div class="flex justify-between text-slate-400">
                <span>Unique Employee ID:</span>
                <span class="font-mono text-emerald-400 font-bold">{{ selectedEmployee.id }}</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>Department / Division:</span>
                <span class="text-slate-200 font-medium">{{ selectedEmployee.department }}</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>Shift Pattern:</span>
                <span class="text-slate-200 font-mono capitalize">{{ selectedEmployee.shiftType }} ({{ selectedEmployee.shiftStart }} - {{ selectedEmployee.shiftEnd }})</span>
              </div>
            </div>

            <!-- Encrypted Token String Display -->
            <div class="pt-2">
              <span class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Raw Encrypted Token Payload
              </span>
              <div class="p-2.5 bg-slate-900 rounded-xl font-mono text-[10px] text-slate-300 break-all select-all border border-slate-800">
                {{ currentEncryptedToken }}
              </div>
            </div>
          </div>
        </div>

        <!-- Tips Banner -->
        <div class="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl flex items-start gap-3 text-xs text-slate-400">
          <Sparkles class="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div class="font-bold text-white mb-0.5">Staff Mobile Compatibility</div>
            <p>
              Employees can screenshot this digital pass and present their smartphone directly to the tablet kiosk camera, or print it onto an standard CR80 ID card for lanyard attachment.
            </p>
          </div>
        </div>
      </div>

      <!-- RIGHT: Interactive Badge Card Display (5 cols) -->
      <div class="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-900/40 border border-slate-800 rounded-3xl shadow-xl">
        <div v-if="selectedEmployee">
          <QrBadgeCard :employee="selectedEmployee" />
        </div>
      </div>
    </div>
  </div>
</template>
