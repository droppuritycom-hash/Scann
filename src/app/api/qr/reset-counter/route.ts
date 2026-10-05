import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { resetSequenceCounter, peekNextSequentialCode } from '@/lib/sequence';
import { logAudit } from '@/lib/audit';
import { EntityType } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { type = 'all' } = body;

    const validTypes = ['serial', 'batch', 'kit', 'all'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Valid type is required: serial, batch, kit, or all' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await resetSequenceCounter(db, type as EntityType | 'all');

    // Log audit
    await logAudit(
      db,
      'COUNTER_RESET',
      type.toUpperCase(),
      (type === 'all' ? 'serial' : type) as EntityType,
      null,
      { resetTypes: result.reset, timestamp: new Date().toISOString() }
    );

    // Fetch updated status
    const [serialDoc, batchDoc, kitDoc] = await Promise.all([
      peekNextSequentialCode(db, 'serial'),
      peekNextSequentialCode(db, 'batch'),
      peekNextSequentialCode(db, 'kit'),
    ]);

    return NextResponse.json({
      success: true,
      message: `Successfully reset ${result.reset.join(', ')} counter(s) back to beginning!`,
      reset: result.reset,
      counters: {
        serial: { index: serialDoc.nextIndex, nextCode: serialDoc.nextCode },
        batch: { index: batchDoc.nextIndex, nextCode: batchDoc.nextCode },
        kit: { index: kitDoc.nextIndex, nextCode: kitDoc.nextCode },
      },
    });
  } catch (err) {
    console.error('[API /api/qr/reset-counter] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to reset sequence counter' },
      { status: 500 }
    );
  }
}
