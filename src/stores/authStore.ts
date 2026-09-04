import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref<boolean>(
    localStorage.getItem('kegama_admin_auth') === 'true'
  );
  const supervisorName = ref<string>(
    localStorage.getItem('kegama_supervisor_name') || 'Operations Admin'
  );

  // Default supervisor PIN: 1234, Admin pass: admin123
  function authenticateWithPin(pin: string): boolean {
    if (pin === '1234' || pin === '0000') {
      isAuthenticated.value = true;
      localStorage.setItem('kegama_admin_auth', 'true');
      return true;
    }
    return false;
  }

  function authenticateWithPassword(password: string): boolean {
    if (password === 'admin123' || password === 'kegama2026') {
      isAuthenticated.value = true;
      localStorage.setItem('kegama_admin_auth', 'true');
      return true;
    }
    return false;
  }

  function logout() {
    isAuthenticated.value = false;
    localStorage.removeItem('kegama_admin_auth');
  }

  return {
    isAuthenticated,
    supervisorName,
    authenticateWithPin,
    authenticateWithPassword,
    logout,
  };
});
