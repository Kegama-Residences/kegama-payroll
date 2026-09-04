<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { Employee } from '../types';
import { generateEncryptedQrToken, generateQrCodeDataUrl } from '../services/crypto';
import { Download, Printer, ShieldCheck, QrCode } from 'lucide-vue-next';

const props = defineProps<{
  employee: Employee;
}>();

const qrDataUrl = ref<string>('');
const encryptedToken = ref<string>('');

async function refreshQr() {
  const token = generateEncryptedQrToken(props.employee);
  encryptedToken.value = token;
  qrDataUrl.value = await generateQrCodeDataUrl(token);
}

onMounted(() => {
  refreshQr();
});

watch(
  () => props.employee,
  () => {
    refreshQr();
  },
  { deep: true }
);

function downloadBadge() {
  if (!qrDataUrl.value) return;
  const link = document.createElement('a');
  link.download = `Kegama_ID_Badge_${props.employee.id}.png`;
  link.href = qrDataUrl.value;
  link.click();
}

function printBadge() {
  window.print();
}
</script>

<template>
  <div class="flex flex-col items-center">
    <!-- Physical ID Card Representation -->
    <div
      id="printable-badge"
      class="w-[300px] h-[460px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-3xl border-2 border-slate-700/80 shadow-2xl p-5 flex flex-col justify-between relative overflow-hidden text-white"
    >
      <!-- Top lanyard slot simulation -->
      <div class="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-800 rounded-full border border-slate-700"></div>

      <!-- Card Top Brand Banner -->
      <div class="pt-2 text-center border-b border-slate-800 pb-3">
        <div class="flex items-center justify-center gap-1.5 text-emerald-400">
          <ShieldCheck class="w-4 h-4" />
          <span class="font-black tracking-wider text-xs uppercase">Kegama Operations</span>
        </div>
        <p class="text-[10px] tracking-widest text-slate-400 uppercase font-semibold">Authorized Personnel Pass</p>
      </div>

      <!-- Employee Photo & Name -->
      <div class="flex flex-col items-center text-center my-auto">
        <div class="relative mb-2.5">
          <img
            v-if="employee.avatarUrl"
            :src="employee.avatarUrl"
            :alt="employee.fullName"
            class="w-20 h-20 rounded-full object-cover border-2 border-emerald-500/80 shadow-lg shadow-emerald-500/10"
          />
          <div
            v-else
            class="w-20 h-20 rounded-full bg-slate-800 border-2 border-emerald-500 flex items-center justify-center text-xl font-bold text-slate-300"
          >
            {{ employee.fullName.charAt(0) }}
          </div>
          <span class="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-slate-950 rounded-md border border-slate-700 font-mono text-[9px] text-emerald-400 font-bold">
            {{ employee.id }}
          </span>
        </div>

        <h4 class="text-base font-bold text-white leading-tight">{{ employee.fullName }}</h4>
        <p class="text-xs text-slate-300 font-medium mt-0.5">{{ employee.jobTitle }}</p>
        <span class="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 uppercase tracking-wider">
          {{ employee.department }}
        </span>

        <!-- Scannable QR Code -->
        <div class="mt-3 p-2 bg-white rounded-2xl shadow-md inline-block">
          <img
            v-if="qrDataUrl"
            :src="qrDataUrl"
            alt="Employee QR Pass"
            class="w-28 h-28 object-contain"
          />
          <div v-else class="w-28 h-28 flex items-center justify-center">
            <QrCode class="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        </div>
      </div>

      <!-- Bottom Card Metadata & Shift Info -->
      <div class="border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-[10px] text-slate-400">
        <div>
          <span class="block text-slate-500 text-[9px] uppercase font-bold">Shift Schedule</span>
          <span class="font-mono text-slate-300 capitalize font-medium">{{ employee.shiftType }} ({{ employee.shiftStart }}–{{ employee.shiftEnd }})</span>
        </div>
        <div class="text-right">
          <span class="block text-slate-500 text-[9px] uppercase font-bold">Status</span>
          <span class="text-emerald-400 font-bold uppercase">{{ employee.status }}</span>
        </div>
      </div>
    </div>

    <!-- Action Buttons (Hidden when printing) -->
    <div class="no-print mt-4 flex items-center gap-2">
      <button
        @click="downloadBadge"
        class="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5"
      >
        <Download class="w-4 h-4 text-emerald-400" />
        <span>Save Pass</span>
      </button>
      <button
        @click="printBadge"
        class="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5"
      >
        <Printer class="w-4 h-4 text-sky-400" />
        <span>Print ID Badge</span>
      </button>
    </div>
  </div>
</template>
