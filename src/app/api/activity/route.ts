import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Filter } from 'mongodb';
import { AuditLog } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || '';
    const code = searchParams.get('code')?.trim() || '';
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '30', 10), 1), 100);

    const query: Filter<AuditLog> = {};
    if (action) {
      query.action = action as AuditLog['action'];
    }
    if (code) {
      query.code = { $regex: code, $options: 'i' };
    }

    const db = await getDb();
    const auditColl = db.collection<AuditLog>('auditLogs');

    const total = await auditColl.countDocuments(query);
    const logs = await auditColl
      .find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    console.error('[API /api/activity] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
