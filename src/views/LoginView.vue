<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { Lock, ArrowLeft } from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();

const pin = ref('');
const password = ref('');
const usePasswordMode = ref(false);
const errorMessage = ref('');

function appendPin(digit: string) {
  if (pin.value.length < 6) {
    pin.value += digit;
  }
}

function deletePin() {
  pin.value = pin.value.slice(0, -1);
}

function clearPin() {
  pin.value = '';
}

function submitPin() {
  errorMessage.value = '';
  if (authStore.authenticateWithPin(pin.value)) {
    router.push('/admin');
  } else {
    errorMessage.value = 'Invalid Supervisor PIN. (Default: 1234)';
    pin.value = '';
  }
}

function submitPassword() {
  errorMessage.value = '';
  if (authStore.authenticateWithPassword(password.value)) {
    router.push('/admin');
  } else {
    errorMessage.value = 'Invalid administrator password. (Default: admin123)';
  }
}

function backToKiosk() {
  router.push('/kiosk');
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 font-sans select-none">
    <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
      <!-- Back to Kiosk button -->
      <button
        @click="backToKiosk"
        class="absolute top-6 left-6 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Kiosk</span>
      </button>

      <!-- Lock Icon & Header -->
      <div class="text-center mt-4 mb-6">
        <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/10">
          <Lock class="w-8 h-8" />
        </div>
        <h2 class="text-2xl font-black text-white">Supervisor Portal</h2>
        <p class="text-xs text-slate-400 mt-1">Enter your 4-digit PIN to access Roster & Payroll</p>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMessage" class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 text-center font-semibold">
        {{ errorMessage }}
      </div>

      <!-- PIN MODE (Tablet touch friendly) -->
      <div v-if="!usePasswordMode" class="space-y-6">
        <!-- PIN Dots Display -->
        <div class="flex justify-center items-center gap-4 my-2">
          <div
            v-for="i in 4"
            :key="i"
            class="w-4 h-4 rounded-full border-2 transition-all"
            :class="pin.length >= i ? 'bg-emerald-400 border-emerald-400 scale-110' : 'border-slate-700 bg-slate-950'"
          ></div>
        </div>

        <!-- Touch Numpad -->
        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="digit in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
            :key="digit"
            @click="appendPin(digit)"
            class="h-14 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-600 active:bg-emerald-500/20 text-xl font-bold font-mono text-white transition flex items-center justify-center"
          >
            {{ digit }}
          </button>

          <button
            @click="clearPin"
            class="h-14 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white transition flex items-center justify-center"
          >
            CLEAR
          </button>

          <button
            @click="appendPin('0')"
            class="h-14 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-600 text-xl font-bold font-mono text-white transition flex items-center justify-center"
          >
            0
          </button>

          <button
            @click="deletePin"
            class="h-14 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white transition flex items-center justify-center"
          >
            DEL
          </button>
        </div>

        <button
          @click="submitPin"
          :disabled="pin.length < 4"
          class="w-full py-3.5 rounded-xl font-bold text-sm bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition shadow-lg shadow-emerald-500/20 disabled:opacity-40"
        >
          Unlock Portal
        </button>

        <div class="text-center pt-2">
          <button
            @click="usePasswordMode = true"
            class="text-xs text-slate-400 hover:text-emerald-400 transition"
          >
            Use admin password instead
          </button>
        </div>
      </div>

      <!-- PASSWORD MODE -->
      <div v-else class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Master Password</label>
          <input
            type="password"
            v-model="password"
            @keyup.enter="submitPassword"
            placeholder="Enter password"
            class="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button
          @click="submitPassword"
          class="w-full py-3.5 rounded-xl font-bold text-sm bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition shadow-lg shadow-emerald-500/20"
        >
          Sign In
        </button>

        <div class="text-center pt-2">
          <button
            @click="usePasswordMode = false"
            class="text-xs text-slate-400 hover:text-emerald-400 transition"
          >
            Switch back to PIN keypad
          </button>
        </div>
      </div>

      <div class="mt-6 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-400">
        Default Demo PIN: <span class="text-emerald-400 font-mono font-bold">1234</span> (Password: <span class="text-emerald-400 font-mono font-bold">admin123</span>)
      </div>
    </div>
  </div>
</template>
