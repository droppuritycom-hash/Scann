import { Db } from 'mongodb';
import { AuditAction, AuditLog, EntityType } from '@/types';

export async function logAudit(
  db: Db,
  action: AuditAction,
  code: string,
  entityType: EntityType | 'system' | 'product',
  entityId?: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const auditColl = db.collection<AuditLog>('auditLogs');
    await auditColl.insertOne({
      action,
      code,
      entityType,
      entityId: entityId || null,
      timestamp: new Date().toISOString(),
      metadata: metadata || {},
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err);
  }
}
