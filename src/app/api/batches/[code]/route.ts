import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Batch } from '@/types';
import { generateQRDataURL } from '@/lib/qr';
import { logAudit } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const batchCode = decodeURIComponent(code).trim().toUpperCase();

    const db = await getDb();
    const batchesColl = db.collection<Batch>('batches');
    const inventoryColl = db.collection('inventoryItems');

    const batch = await batchesColl.findOne({ code: batchCode });
    if (!batch) {
      return NextResponse.json(
        { error: `Batch ${batchCode} not found` },
        { status: 404 }
      );
    }

    const items = await inventoryColl
      .find({ batchCode })
      .sort({ createdAt: -1 })
      .toArray();

    const qrDataUrl = await generateQRDataURL(batchCode, 'batch');

    return NextResponse.json({
      batch,
      products: items,
      productCount: items.length,
      qrDataUrl,
    });
  } catch (err) {
    console.error('[API /api/batches/[code]] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch batch details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const batchCode = decodeURIComponent(code).trim().toUpperCase();
    const body = await req.json();
    const { status } = body;

    if (!['open', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Status must be open or closed' }, { status: 400 });
    }

    const db = await getDb();
    const batchesColl = db.collection<Batch>('batches');

    const result = await batchesColl.findOneAndUpdate(
      { code: batchCode },
      { $set: { status, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    if (status === 'closed') {
      await logAudit(db, 'BATCH_CLOSED', batchCode, 'batch', result._id?.toString());
    }

    return NextResponse.json({ success: true, batch: result });
  } catch (err) {
    console.error('[API PATCH /api/batches/[code]] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to update batch' },
      { status: 500 }
    );
  }
}
