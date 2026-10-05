import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { validateQRCode } from '@/lib/validation';
import { logAudit } from '@/lib/audit';
import { Batch } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    const validation = validateQRCode(code, 'batch');
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const batchCode = validation.normalizedCode;
    const baseCode = batchCode.replace(/^BAT-/, '');

    const db = await getDb();
    const batchesColl = db.collection<Batch>('batches');
    const inventoryColl = db.collection('inventoryItems');

    // Find or create batch
    let batch = await batchesColl.findOne({ code: batchCode });

    if (!batch) {
      const now = new Date().toISOString();
      const newBatch: Batch = {
        code: batchCode,
        baseCode,
        status: 'open',
        productCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      try {
        const insertRes = await batchesColl.insertOne(newBatch);
        batch = { ...newBatch, _id: insertRes.insertedId };
        await logAudit(db, 'BATCH_CREATED', batchCode, 'batch', insertRes.insertedId.toString(), {
          autoCreatedOnScan: true,
        });
      } catch (insertErr: unknown) {
        // Handle race condition if batch was inserted concurrently
        if (typeof insertErr === 'object' && insertErr !== null && 'code' in insertErr && (insertErr as { code: number }).code === 11000) {
          batch = await batchesColl.findOne({ code: batchCode });
        } else {
          throw insertErr;
        }
      }
    }

    // Get current products in this batch
    const items = await inventoryColl
      .find({ batchCode })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      batch,
      products: items,
      productCount: items.length,
    });
  } catch (err) {
    console.error('[API /api/scan/batch] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to process batch scan' },
      { status: 500 }
    );
  }
}
