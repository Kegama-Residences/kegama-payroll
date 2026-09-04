import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/kiosk',
  },
  {
    path: '/kiosk',
    name: 'Kiosk',
    component: () => import('../views/KioskView.vue'),
    meta: { mode: 'kiosk' },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
  },
  {
    path: '/admin',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('../views/admin/DashboardView.vue'),
      },
      {
        path: 'employees',
        name: 'AdminEmployees',
        component: () => import('../views/admin/EmployeesView.vue'),
      },
      {
        path: 'qr-passes',
        name: 'AdminQrPasses',
        component: () => import('../views/admin/QrPassView.vue'),
      },
      {
        path: 'attendance',
        name: 'AdminAttendance',
        component: () => import('../views/admin/AttendanceView.vue'),
      },
      {
        path: 'payroll',
        name: 'AdminPayroll',
        component: () => import('../views/admin/PayrollView.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/kiosk',
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } });
  } else {
    next();
  }
});

export default router;
