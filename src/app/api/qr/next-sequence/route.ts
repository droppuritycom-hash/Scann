import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { peekNextSequentialCode, formatCode } from '@/lib/sequence';
import { EntityType } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get('type') || 'serial') as EntityType;
    const count = parseInt(searchParams.get('count') || '63', 10);

    const db = await getDb();
    const { nextIndex, nextCode } = await peekNextSequentialCode(db, type);
    const lastCode = formatCode(nextIndex + Math.max(1, count) - 1, type);

    // Also get audit count for history tab
    const auditColl = db.collection('auditLogs');
    const historyCount = await auditColl.countDocuments({ action: 'QR_GENERATED' });

    return NextResponse.json({
      success: true,
      type,
      nextIndex,
      firstCode: nextCode,
      lastCode,
      historyCount,
    });
  } catch (err) {
    console.error('[API /api/qr/next-sequence] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch next sequence' },
      { status: 500 }
    );
  }
}
