import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { db, seedDatabaseIfEmpty, type SyncQueueItem } from '../services/db';
import { soundService } from '../services/audio';
import type { AttendanceLog, Employee, LogType } from '../types';

export interface ConfirmationData {
  employee: Employee;
  log: AttendanceLog;
  timestampFormatted: string;
  shiftStatusText: string;
}

export const useAttendanceStore = defineStore('attendance', () => {
  const logs = ref<AttendanceLog[]>([]);
  const pendingSyncQueue = ref<SyncQueueItem[]>([]);
  const isNetworkOnline = ref<boolean>(navigator.onLine);
  const simulateOfflineMode = ref<boolean>(false);
  const isSyncing = ref<boolean>(false);

  // Active confirmation popup state (3-second duration)
  const confirmationModal = ref<ConfirmationData | null>(null);

  // Debounce tracking
  const lastScanTime = ref<number>(0);
  const lastScannedId = ref<string>('');
  const DEBOUNCE_MS = 3000;

  const isEffectivelyOnline = computed(() => {
    return isNetworkOnline.value && !simulateOfflineMode.value;
  });

  const pendingSyncCount = computed(() => pendingSyncQueue.value.length);

  // Setup network listeners
  function initNetworkListeners() {
    window.addEventListener('online', () => {
      isNetworkOnline.value = true;
      syncPendingLogs();
    });
    window.addEventListener('offline', () => {
      isNetworkOnline.value = false;
    });
  }

  async function loadLogs() {
    await seedDatabaseIfEmpty();
    logs.value = await db.attendanceLogs.toArray();
    pendingSyncQueue.value = await db.syncQueue.where('status').equals('pending').toArray();
  }

  /**
   * Records a punch from Kiosk scanner or manual toggle
   */
  async function recordPunch(
    employee: Employee,
    selectedMode: LogType
  ): Promise<{ success: boolean; message: string; log?: AttendanceLog }> {
    const now = Date.now();

    // 3-second debounce window check
    if (
      lastScannedId.value === employee.id &&
      now - lastScanTime.value < DEBOUNCE_MS
    ) {
      soundService.playErrorBuzzer();
      return {
        success: false,
        message: `Please wait ${Math.ceil((DEBOUNCE_MS - (now - lastScanTime.value)) / 1000)}s before scanning ${employee.fullName} again.`,
      };
    }

    lastScanTime.value = now;
    lastScannedId.value = employee.id;

    const timestampIso = new Date().toISOString();
    const newLogId = `LOG-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const online = isEffectivelyOnline.value;

    const log: AttendanceLog = {
      id: newLogId,
      employeeId: employee.id,
      logType: selectedMode,
      timestamp: timestampIso,
      manualOverride: false,
      synced: online,
      deviceId: 'KIOSK-TABLET-01',
    };

    // 1. Write to local database memory first (Offline handling principle)
    await db.attendanceLogs.add(log);
    logs.value.unshift(log);

    // 2. Queue for remote sync if offline or push immediately if online
    if (!online) {
      const queueItem: SyncQueueItem = {
        id: `SYNC-${Date.now()}`,
        logId: log.id,
        payload: log,
        createdAt: timestampIso,
        status: 'pending',
      };
      await db.syncQueue.add(queueItem);
      pendingSyncQueue.value.push(queueItem);
      console.log(`[Offline Queue] Punch ${log.id} stored in local device memory.`);
    }

    // 3. Audio feedback
    if (selectedMode === 'TIME_IN') {
      soundService.playTimeInChime();
    } else {
      soundService.playTimeOutChime();
    }

    // 4. Compute shift status (e.g. On-Time vs Late)
    const punchDate = new Date(timestampIso);
    const punchMinutes = punchDate.getHours() * 60 + punchDate.getMinutes();
    const [h, m] = employee.shiftStart.split(':').map(Number);
    const scheduledMinutes = (h || 0) * 60 + (m || 0);

    let statusText = 'Recorded On-Time';
    if (selectedMode === 'TIME_IN' && punchMinutes > scheduledMinutes) {
      const diff = punchMinutes - scheduledMinutes;
      statusText = `Late Arrival: +${diff} mins`;
    } else if (selectedMode === 'TIME_OUT') {
      statusText = 'Shift Ended';
    }

    // 5. Trigger Visual Confirmation Card
    confirmationModal.value = {
      employee,
      log,
      timestampFormatted: punchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      shiftStatusText: statusText,
    };

    // Auto-dismiss confirmation card after 3 seconds
    setTimeout(() => {
      if (confirmationModal.value?.log.id === log.id) {
        confirmationModal.value = null;
      }
    }, 3200);

    return {
      success: true,
      message: `Punch ${selectedMode} recorded successfully.`,
      log,
    };
  }

  /**
   * Syncs pending logs to cloud server
   */
  async function syncPendingLogs() {
    if (isSyncing.value || !isEffectivelyOnline.value) return;

    const pending = await db.syncQueue.where('status').equals('pending').toArray();
    if (pending.length === 0) return;

    isSyncing.value = true;
    try {
      // Simulate network latency / cloud batch upload
      await new Promise((resolve) => setTimeout(resolve, 600));

      for (const item of pending) {
        // Mark log as synced in db
        await db.attendanceLogs.update(item.logId, { synced: true });
        await db.syncQueue.update(item.id, { status: 'synced' });

        const logIndex = logs.value.findIndex((l) => l.id === item.logId);
        if (logIndex !== -1) {
          logs.value[logIndex].synced = true;
        }
      }

      pendingSyncQueue.value = await db.syncQueue.where('status').equals('pending').toArray();
      console.log(`[Cloud Sync] Synced ${pending.length} offline punches to cloud.`);
    } catch (e) {
      console.error('Failed to sync offline punches:', e);
    } finally {
      isSyncing.value = false;
    }
  }

  /**
   * Supervisor manual punch adjustment
   */
  async function addManualPunch(
    employeeId: string,
    logType: LogType,
    isoTimestamp: string,
    supervisorNote: string
  ): Promise<AttendanceLog> {
    const newLogId = `MANUAL-${Date.now().toString(36).toUpperCase()}`;
    const log: AttendanceLog = {
      id: newLogId,
      employeeId,
      logType,
      timestamp: isoTimestamp,
      manualOverride: true,
      supervisorNote,
      synced: true,
      deviceId: 'ADMIN-SUPERVISOR',
    };

    await db.attendanceLogs.add(log);
    logs.value.unshift(log);
    return log;
  }

  async function updatePunch(id: string, updates: Partial<AttendanceLog>) {
    await db.attendanceLogs.update(id, updates);
    const idx = logs.value.findIndex((l) => l.id === id);
    if (idx !== -1) {
      logs.value[idx] = { ...logs.value[idx], ...updates };
    }
  }

  async function deletePunch(id: string) {
    await db.attendanceLogs.delete(id);
    logs.value = logs.value.filter((l) => l.id !== id);
  }

  function dismissConfirmation() {
    confirmationModal.value = null;
  }

  return {
    logs,
    pendingSyncQueue,
    pendingSyncCount,
    isNetworkOnline,
    simulateOfflineMode,
    isEffectivelyOnline,
    isSyncing,
    confirmationModal,
    initNetworkListeners,
    loadLogs,
    recordPunch,
    syncPendingLogs,
    addManualPunch,
    updatePunch,
    deletePunch,
    dismissConfirmation,
  };
});
