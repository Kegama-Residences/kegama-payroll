<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useEmployeeStore } from '../../stores/employeeStore';
import type { Employee, ShiftType } from '../../types';
import {
  Users,
  Plus,
  Search,
  Edit2,
  QrCode,
  CheckCircle2,
  XCircle,
  X,
  Moon,
  Sun
} from 'lucide-vue-next';

const router = useRouter();
const employeeStore = useEmployeeStore();

const searchQuery = ref('');
const departmentFilter = ref('ALL');

// Modal State
const isModalOpen = ref(false);
const editingEmployeeId = ref<string | null>(null);

const formId = ref('');
const formName = ref('');
const formTitle = ref('');
const formDept = ref('Operations');
const formDailyRate = ref<number>(750);
const formMonthlyRate = ref<number>(19500);
const formSss = ref<number>(850);
const formPhilHealth = ref<number>(400);
const formPagIbig = ref<number>(200);
const formLoan = ref<number>(0);
const formShiftType = ref<ShiftType>('regular');
const formShiftStart = ref('08:00');
const formShiftEnd = ref('17:00');
const formAvatar = ref('');

onMounted(async () => {
  await employeeStore.loadEmployees();
});

const departments = computed(() => {
  const depts = new Set(employeeStore.employees.map((e) => e.department));
  return Array.from(depts);
});

const filteredEmployees = computed(() => {
  return employeeStore.employees.filter((emp) => {
    const matchesSearch =
      emp.fullName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      emp.jobTitle.toLowerCase().includes(searchQuery.value.toLowerCase());

    const matchesDept =
      departmentFilter.value === 'ALL' || emp.department === departmentFilter.value;

    return matchesSearch && matchesDept;
  });
});

function openAddModal() {
  editingEmployeeId.value = null;
  const nextNum = employeeStore.employees.length + 1;
  formId.value = `KR-${String(nextNum).padStart(3, '0')}`;
  formName.value = '';
  formTitle.value = '';
  formDept.value = 'Operations';
  formDailyRate.value = 750;
  formMonthlyRate.value = 19500;
  formSss.value = 850;
  formPhilHealth.value = 400;
  formPagIbig.value = 200;
  formLoan.value = 0;
  formShiftType.value = 'regular';
  formShiftStart.value = '08:00';
  formShiftEnd.value = '17:00';
  formAvatar.value = '';
  isModalOpen.value = true;
}

function openEditModal(emp: Employee) {
  editingEmployeeId.value = emp.id;
  formId.value = emp.id;
  formName.value = emp.fullName;
  formTitle.value = emp.jobTitle;
  formDept.value = emp.department;
  formDailyRate.value = emp.dailyRate;
  formMonthlyRate.value = emp.monthlyBasicRate;
  formSss.value = emp.sssShare;
  formPhilHealth.value = emp.philHealthShare;
  formPagIbig.value = emp.pagIbigShare;
  formLoan.value = emp.loanBalance;
  formShiftType.value = emp.shiftType;
  formShiftStart.value = emp.shiftStart;
  formShiftEnd.value = emp.shiftEnd;
  formAvatar.value = emp.avatarUrl || '';
  isModalOpen.value = true;
}

function onShiftTypeChange() {
  if (formShiftType.value === 'night') {
    formShiftStart.value = '22:00';
    formShiftEnd.value = '06:00';
  } else {
    formShiftStart.value = '08:00';
    formShiftEnd.value = '17:00';
  }
}

async function handleSaveEmployee() {
  if (!formName.value.trim() || !formId.value.trim()) {
    alert('Please enter employee name and valid ID.');
    return;
  }

  if (editingEmployeeId.value) {
    // Update
    await employeeStore.updateEmployee(editingEmployeeId.value, {
      fullName: formName.value.trim(),
      jobTitle: formTitle.value.trim(),
      department: formDept.value,
      dailyRate: Number(formDailyRate.value),
      monthlyBasicRate: Number(formMonthlyRate.value),
      sssShare: Number(formSss.value),
      philHealthShare: Number(formPhilHealth.value),
      pagIbigShare: Number(formPagIbig.value),
      loanBalance: Number(formLoan.value),
      shiftType: formShiftType.value,
      shiftStart: formShiftStart.value,
      shiftEnd: formShiftEnd.value,
      avatarUrl: formAvatar.value.trim() || undefined,
    });
  } else {
    // Add new
    await employeeStore.addEmployee({
      id: formId.value.trim().toUpperCase(),
      fullName: formName.value.trim(),
      jobTitle: formTitle.value.trim() || 'Staff Associate',
      department: formDept.value,
      dailyRate: Number(formDailyRate.value),
      monthlyBasicRate: Number(formMonthlyRate.value),
      sssShare: Number(formSss.value),
      philHealthShare: Number(formPhilHealth.value),
      pagIbigShare: Number(formPagIbig.value),
      loanBalance: Number(formLoan.value),
      shiftType: formShiftType.value,
      shiftStart: formShiftStart.value,
      shiftEnd: formShiftEnd.value,
      avatarUrl: formAvatar.value.trim() || undefined,
      status: 'active',
    });
  }

  isModalOpen.value = false;
}

function viewQrBadge(empId: string) {
  router.push({ path: '/admin/qr-passes', query: { emp: empId } });
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header Row -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Users class="w-6 h-6 text-emerald-400" />
          <span>Employee Roster Management</span>
        </h1>
        <p class="text-xs text-slate-400 mt-1">Configure compensation rates, statutory contributions, and night/day shift schedules</p>
      </div>

      <button
        @click="openAddModal"
        class="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
      >
        <Plus class="w-4 h-4" />
        <span>Add New Employee</span>
      </button>
    </div>

    <!-- Search & Filter Bar -->
    <div class="flex flex-col sm:flex-row gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
      <div class="relative flex-1">
        <Search class="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search by name, ID (e.g. KR-001), or title..."
          class="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      <div class="flex items-center gap-2">
        <select
          v-model="departmentFilter"
          class="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">All Departments</option>
          <option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
        </select>
      </div>
    </div>

    <!-- Roster Table -->
    <div class="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase tracking-wider font-semibold">
              <th class="p-4">Employee</th>
              <th class="p-4">Position & Dept</th>
              <th class="p-4">Shift Schedule</th>
              <th class="p-4">Wage Rates</th>
              <th class="p-4">Statutory Shares</th>
              <th class="p-4">Loan Bal</th>
              <th class="p-4">Status</th>
              <th class="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            <tr
              v-for="emp in filteredEmployees"
              :key="emp.id"
              class="hover:bg-slate-800/40 transition"
            >
              <!-- Employee Info -->
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <img
                    v-if="emp.avatarUrl"
                    :src="emp.avatarUrl"
                    :alt="emp.fullName"
                    class="w-9 h-9 rounded-full object-cover border border-slate-700"
                  />
                  <div
                    v-else
                    class="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300"
                  >
                    {{ emp.fullName.charAt(0) }}
                  </div>
                  <div>
                    <span class="font-bold text-white block">{{ emp.fullName }}</span>
                    <span class="font-mono text-[10px] text-emerald-400 font-semibold">{{ emp.id }}</span>
                  </div>
                </div>
              </td>

              <!-- Position -->
              <td class="p-4">
                <span class="text-white font-medium block">{{ emp.jobTitle }}</span>
                <span class="text-slate-400 text-[10px]">{{ emp.department }}</span>
              </td>

              <!-- Shift Schedule -->
              <td class="p-4">
                <div class="flex items-center gap-1.5">
                  <Moon v-if="emp.shiftType === 'night'" class="w-3.5 h-3.5 text-indigo-400" />
                  <Sun v-else class="w-3.5 h-3.5 text-amber-400" />
                  <span class="capitalize font-semibold text-slate-200">
                    {{ emp.shiftType }}
                  </span>
                </div>
                <span class="text-[10px] text-slate-400 font-mono block mt-0.5">
                  {{ emp.shiftStart }} – {{ emp.shiftEnd }}
                  <span v-if="emp.shiftType === 'night'" class="text-indigo-400 font-bold ml-1">(+1d crossover)</span>
                </span>
              </td>

              <!-- Wage Rates -->
              <td class="p-4">
                <div class="font-mono font-bold text-white">PHP {{ emp.dailyRate.toLocaleString() }}/day</div>
                <div class="text-[10px] text-slate-400 font-mono">PHP {{ emp.monthlyBasicRate.toLocaleString() }}/mo</div>
              </td>

              <!-- Statutory Shares -->
              <td class="p-4 font-mono text-[11px] text-slate-300 space-y-0.5">
                <div>SSS: <span class="text-slate-200 font-semibold">PHP {{ emp.sssShare }}</span></div>
                <div>PhilH: <span class="text-slate-200 font-semibold">PHP {{ emp.philHealthShare }}</span></div>
                <div>Pag-IBIG: <span class="text-slate-200 font-semibold">PHP {{ emp.pagIbigShare }}</span></div>
              </td>

              <!-- Loan Balance -->
              <td class="p-4">
                <span
                  class="font-mono font-bold text-xs"
                  :class="emp.loanBalance > 0 ? 'text-amber-400' : 'text-slate-500'"
                >
                  PHP {{ emp.loanBalance.toLocaleString() }}
                </span>
              </td>

              <!-- Status -->
              <td class="p-4">
                <button
                  @click="employeeStore.toggleEmployeeStatus(emp.id)"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition"
                  :class="emp.status === 'active'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-500/15 text-red-300 border border-red-500/30'"
                  :title="`Click to mark ${emp.status === 'active' ? 'inactive' : 'active'}`"
                >
                  <CheckCircle2 v-if="emp.status === 'active'" class="w-3 h-3" />
                  <XCircle v-else class="w-3 h-3" />
                  <span class="capitalize">{{ emp.status }}</span>
                </button>
              </td>

              <!-- Actions -->
              <td class="p-4 text-right">
                <div class="inline-flex items-center gap-1.5">
                  <button
                    @click="viewQrBadge(emp.id)"
                    class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition"
                    title="View & Print QR Pass"
                  >
                    <QrCode class="w-4 h-4" />
                  </button>
                  <button
                    @click="openEditModal(emp)"
                    class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="Edit Record"
                  >
                    <Edit2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ADD / EDIT EMPLOYEE MODAL -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div class="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 class="text-base font-bold text-white">
            {{ editingEmployeeId ? 'Edit Employee Record' : 'Register New Employee' }}
          </h3>
          <button @click="isModalOpen = false" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Form Body -->
        <div class="p-6 overflow-y-auto space-y-4 text-xs">
          <!-- Row 1: ID & Name -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Employee ID</label>
              <input
                type="text"
                v-model="formId"
                :disabled="!!editingEmployeeId"
                class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label class="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Full Legal Name</label>
              <input
                type="text"
                v-model="formName"
                placeholder="e.g. Maria Santos"
                class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <!-- Row 2: Title & Dept -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Job Title</label>
              <input
                type="text"
                v-model="formTitle"
                placeholder="e.g. Senior Technician"
                class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label class="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Department</label>
              <select
                v-model="formDept"
                class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Operations">Operations</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Security">Security</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Logistics">Logistics</option>
                <option value="Administration">Administration</option>
              </select>
            </div>
          </div>

          <!-- Row 3: Shift Type & Hours (Supports Midnight Crossover!) -->
          <div class="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
            <label class="block font-bold text-slate-300 uppercase tracking-wider">Shift Configuration (Midnight Crossover Support)</label>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-[10px] text-slate-400 uppercase mb-1">Shift Type</label>
                <select
                  v-model="formShiftType"
                  @change="onShiftTypeChange"
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="regular">Regular (Day Shift)</option>
                  <option value="night">Night Shift (Midnight Crossover)</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] text-slate-400 uppercase mb-1">Scheduled Start</label>
                <input
                  type="time"
                  v-model="formShiftStart"
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label class="block text-[10px] text-slate-400 uppercase mb-1">Scheduled End</label>
                <input
                  type="time"
                  v-model="formShiftEnd"
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <p v-if="formShiftType === 'night'" class="text-[11px] text-indigo-300">
              🌙 Night Shift mode: The payroll engine automatically binds TIME_IN punches (e.g. 22:00) with TIME_OUT punches the following calendar day (e.g. 06:00).
            </p>
          </div>

          <!-- Row 4: Compensation Rates -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Daily Basic Wage (PHP)</label>
              <input
                type="number"
                v-model="formDailyRate"
                class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label class="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Monthly Equivalent (PHP)</label>
              <input
                type="number"
                v-model="formMonthlyRate"
                class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <!-- Row 5: Statutory Shares (Employee Contribution Amounts) -->
          <div class="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
            <label class="block font-bold text-slate-300 uppercase tracking-wider">Statutory Deductions (Monthly Employee Share)</label>
            <p class="text-[11px] text-slate-400">Note: Semi-monthly cutoffs will automatically apply exactly half of these amounts.</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-[10px] text-slate-400 uppercase mb-1">SSS Monthly (PHP)</label>
                <input
                  type="number"
                  v-model="formSss"
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label class="block text-[10px] text-slate-400 uppercase mb-1">PhilHealth Monthly (PHP)</label>
                <input
                  type="number"
                  v-model="formPhilHealth"
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label class="block text-[10px] text-slate-400 uppercase mb-1">Pag-IBIG Monthly (PHP)</label>
                <input
                  type="number"
                  v-model="formPagIbig"
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <!-- Row 6: Loan Balance & Avatar URL -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Cash Advance / Loan Balance (PHP)</label>
              <input
                type="number"
                v-model="formLoan"
                class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label class="block font-semibold text-slate-400 uppercase tracking-wider mb-1">Avatar Image URL (Optional)</label>
              <input
                type="url"
                v-model="formAvatar"
                placeholder="https://images.unsplash.com/..."
                class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            @click="isModalOpen = false"
            class="px-4 py-2 font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleSaveEmployee"
            class="px-5 py-2 font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition shadow-lg shadow-emerald-500/20"
          >
            Save Employee
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
