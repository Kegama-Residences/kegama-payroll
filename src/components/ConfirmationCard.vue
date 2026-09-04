<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { ConfirmationData } from '../stores/attendanceStore';
import { CheckCircle, Clock, UserCheck, ShieldCheck, X } from 'lucide-vue-next';

const props = defineProps<{
  data: ConfirmationData;
}>();

const emit = defineEmits<{
  (e: 'dismiss'): void;
}>();

const isTimeIn = computed(() => props.data.log.logType === 'TIME_IN');
const progress = ref(100);

onMounted(() => {
  const duration = 3000;
  const interval = 30;
  const step = (interval / duration) * 100;

  const timer = setInterval(() => {
    progress.value = Math.max(0, progress.value - step);
    if (progress.value <= 0) {
      clearInterval(timer);
    }
  }, interval);
});
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
    <div
      class="relative w-full max-w-lg overflow-hidden rounded-3xl border shadow-2xl transition-all"
      :class="isTimeIn ? 'border-emerald-500/50 bg-gradient-to-b from-slate-900 to-emerald-950/40' : 'border-amber-500/50 bg-gradient-to-b from-slate-900 to-amber-950/40'"
    >
      <!-- Auto-dismiss countdown bar -->
      <div class="h-2 w-full bg-slate-800/80">
        <div
          class="h-full transition-all duration-75 ease-linear"
          :class="isTimeIn ? 'bg-emerald-400' : 'bg-amber-400'"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>

      <!-- Close button -->
      <button
        @click="emit('dismiss')"
        class="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
      >
        <X class="w-5 h-5" />
      </button>

      <div class="p-8 text-center flex flex-col items-center">
        <!-- Punch Badge Icon -->
        <div
          class="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg mb-6 ring-4 animate-bounce-short"
          :class="isTimeIn ? 'bg-emerald-500 text-white ring-emerald-500/30' : 'bg-amber-500 text-white ring-amber-500/30'"
        >
          <CheckCircle v-if="isTimeIn" class="w-12 h-12" />
          <Clock v-else class="w-12 h-12" />
        </div>

        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-3"
          :class="isTimeIn ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'"
        >
          <span class="w-2 h-2 rounded-full animate-ping" :class="isTimeIn ? 'bg-emerald-400' : 'bg-amber-400'"></span>
          {{ isTimeIn ? 'SUCCESSFUL TIME IN' : 'SUCCESSFUL TIME OUT' }}
        </div>

        <!-- Employee Avatar and Name -->
        <div class="relative my-2">
          <img
            v-if="data.employee.avatarUrl"
            :src="data.employee.avatarUrl"
            :alt="data.employee.fullName"
            class="w-24 h-24 rounded-full object-cover border-4 border-slate-700 shadow-xl"
          />
          <div
            v-else
            class="w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center text-2xl font-bold text-slate-300"
          >
            {{ data.employee.fullName.charAt(0) }}
          </div>
          <span class="absolute bottom-0 right-0 p-1.5 rounded-full bg-slate-900 border border-slate-700 text-emerald-400">
            <ShieldCheck class="w-4 h-4" />
          </span>
        </div>

        <h3 class="text-2xl font-extrabold text-white mt-2">{{ data.employee.fullName }}</h3>
        <p class="text-slate-400 text-sm font-medium mt-0.5">
          <span class="text-emerald-400 font-mono font-bold">{{ data.employee.id }}</span> • {{ data.employee.jobTitle }}
        </p>

        <!-- Recorded Timestamp and Status -->
        <div class="mt-6 w-full grid grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <div class="text-left border-r border-slate-800 pr-3">
            <span class="text-xs text-slate-400 block font-medium">Recorded Time</span>
            <span class="text-xl font-bold font-mono text-white">{{ data.timestampFormatted }}</span>
          </div>
          <div class="text-left pl-1">
            <span class="text-xs text-slate-400 block font-medium">Shift Status</span>
            <span
              class="text-sm font-bold block truncate"
              :class="data.shiftStatusText.includes('Late') ? 'text-amber-400' : 'text-emerald-400'"
            >
              {{ data.shiftStatusText }}
            </span>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <UserCheck class="w-4 h-4 text-slate-400" />
          <span>Attendance logged to device memory • Ready for next staff</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fadeIn {
  animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
