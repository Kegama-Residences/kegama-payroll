import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db, seedDatabaseIfEmpty } from '../services/db';
import type { Employee } from '../types';

export const useEmployeeStore = defineStore('employees', () => {
  const employees = ref<Employee[]>([]);
  const loading = ref<boolean>(false);

  async function loadEmployees() {
    loading.value = true;
    try {
      await seedDatabaseIfEmpty();
      employees.value = await db.employees.toArray();
    } finally {
      loading.value = false;
    }
  }

  function getEmployeeById(id: string): Employee | undefined {
    const cleanId = id.trim().toUpperCase();
    return employees.value.find((e) => e.id.toUpperCase() === cleanId);
  }

  async function addEmployee(newEmp: Omit<Employee, 'createdAt'>): Promise<Employee> {
    const fullEmp: Employee = {
      ...newEmp,
      createdAt: new Date().toISOString(),
    };
    await db.employees.add(fullEmp);
    employees.value.push(fullEmp);
    return fullEmp;
  }

  async function updateEmployee(id: string, updates: Partial<Employee>) {
    await db.employees.update(id, updates);
    const index = employees.value.findIndex((e) => e.id === id);
    if (index !== -1) {
      employees.value[index] = { ...employees.value[index], ...updates };
    }
  }

  async function toggleEmployeeStatus(id: string) {
    const emp = getEmployeeById(id);
    if (emp) {
      const newStatus = emp.status === 'active' ? 'inactive' : 'active';
      await updateEmployee(id, { status: newStatus });
    }
  }

  return {
    employees,
    loading,
    loadEmployees,
    getEmployeeById,
    addEmployee,
    updateEmployee,
    toggleEmployeeStatus,
  };
});
