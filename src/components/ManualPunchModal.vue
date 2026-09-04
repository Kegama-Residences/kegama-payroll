<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useEmployeeStore } from '../stores/employeeStore';
import { useAttendanceStore } from '../stores/attendanceStore';
import type { LogType } from '../types';
import { X, Clock, ShieldAlert, CheckCircle2 } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  initialEmployeeId?: string;
  initialDate?: string;
  initialType?: LogType;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
}>();

const employeeStore = useEmployeeStore();
const attendanceStore = useAttendanceStore();

const selectedEmployeeId = ref('');
const selectedType = ref<LogType>('TIME_OUT');
const punchDate = ref('');
const punchTime = ref('');
const supervisorNote = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');

// Initialize fields when opened
watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      selectedEmployeeId.value = props.initialEmployeeId || (employeeStore.employees[0]?.id ?? '');
      selectedType.value = props.initialType || 'TIME_OUT';

      const now = new Date();
      punchDate.value = props.initialDate || now.toISOString().slice(0, 10);
      punchTime.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      supervisorNote.value = 'Supervisor manual punch approval (missed badge swipe)';
      errorMessage.value = '';
    }
  }
);

const activeEmployee = computed(() => {
  return employeeStore.getEmployeeById(selectedEmployeeId.value);
});

async function handleSave() {
  if (!selectedEmployeeId.value) {
    errorMessage.value = 'Please select an employee.';
    return;
  }
  if (!punchDate.value || !punchTime.value) {
    errorMessage.value = 'Please specify valid date and time.';
    return;
  }
  if (!supervisorNote.value.trim()) {
    errorMessage.value = 'Supervisor justification note is required for audit trail.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const isoString = new Date(`${punchDate.value}T${punchTime.value}:00`).toISOString();
    await attendanceStore.addManualPunch(
      selectedEmployeeId.value,
      selectedType.value,
      isoString,
      supervisorNote.value.trim()
    );
    emit('saved');
    emit('close');
  } catch (e: unknown) {
    errorMessage.value = e instanceof Error ? e.message : 'Failed to save manual punch.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
    <div class="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">Manual Punch Override</h3>
            <p class="text-xs text-slate-400">Resolve missed punches or adjust official times</p>
          </div>
        </div>
        <button
          @click="emit('close')"
          class="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Warning Banner -->
      <div class="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-xs text-amber-300">
        <ShieldAlert class="w-4 h-4 shrink-0 text-amber-400" />
        <span>Manual adjustments are flagged in payroll audit logs as supervisor overrides.</span>
      </div>

      <!-- Body Form -->
      <div class="p-6 space-y-4">
        <!-- Error Message -->
        <div v-if="errorMessage" class="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
          {{ errorMessage }}
        </div>

        <!-- Employee Select -->
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Employee</label>
          <select
            v-model="selectedEmployeeId"
            class="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
          >
            <option
              v-for="emp in employeeStore.employees"
              :key="emp.id"
              :value="emp.id"
            >
              {{ emp.id }} — {{ emp.fullName }} ({{ emp.jobTitle }})
            </option>
          </select>
          <div v-if="activeEmployee" class="mt-1 text-xs text-slate-500 flex gap-2">
            <span>Shift: {{ activeEmployee.shiftStart }} - {{ activeEmployee.shiftEnd }}</span>
            <span>•</span>
            <span class="capitalize">Type: {{ activeEmployee.shiftType }}</span>
          </div>
        </div>

        <!-- Punch Type Toggle -->
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Punch Action</label>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              @click="selectedType = 'TIME_IN'"
              class="py-2.5 px-4 rounded-xl text-sm font-bold border transition flex items-center justify-center gap-2"
              :class="selectedType === 'TIME_IN' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'"
            >
              <span>🟢 TIME IN</span>
            </button>
            <button
              type="button"
              @click="selectedType = 'TIME_OUT'"
              class="py-2.5 px-4 rounded-xl text-sm font-bold border transition flex items-center justify-center gap-2"
              :class="selectedType === 'TIME_OUT' ? 'bg-amber-500/20 text-amber-400 border-amber-500' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'"
            >
              <span>🔴 TIME OUT</span>
            </button>
          </div>
        </div>

        <!-- Date and Time Picker -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
            <input
              type="date"
              v-model="punchDate"
              class="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Time</label>
            <input
              type="time"
              step="1"
              v-model="punchTime"
              class="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <!-- Supervisor Audit Note -->
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Supervisor Reason / Audit Trail Note <span class="text-red-400">*</span>
          </label>
          <textarea
            v-model="supervisorNote"
            rows="2"
            placeholder="e.g., Staff forgot to scan out after overtime; verified by shift manager"
            class="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
          ></textarea>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="px-6 py-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-end gap-3">
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="handleSave"
          :disabled="isSubmitting"
          class="px-5 py-2.5 text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
        >
          <CheckCircle2 class="w-4 h-4" />
          <span>Save & Apply Adjustment</span>
        </button>
      </div>
    </div>
  </div>
</template>
