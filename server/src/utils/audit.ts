import { getDb } from '../db/database.js';

export function recordAuditLog(action: string, entityType: string, entityId?: string, details?: Record<string, any>): void {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      action,
      entityType,
      entityId || null,
      details ? JSON.stringify(details) : null,
      new Date().toISOString()
    );
  } catch (err) {
    console.error('[Audit Log Error]', err);
  }
}
