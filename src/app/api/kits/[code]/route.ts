import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Kit } from '@/types';
import { generateQRDataURL } from '@/lib/qr';
import { logAudit } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const kitCode = decodeURIComponent(code).trim().toUpperCase();

    const db = await getDb();
    const kitsColl = db.collection<Kit>('kits');
    const inventoryColl = db.collection('inventoryItems');

    const kit = await kitsColl.findOne({ code: kitCode });
    if (!kit) {
      return NextResponse.json(
        { error: `Kit ${kitCode} not found` },
        { status: 404 }
      );
    }

    const items = await inventoryColl
      .find({ kitCode })
      .sort({ updatedAt: -1 })
      .toArray();

    const qrDataUrl = await generateQRDataURL(kitCode, 'kit');

    return NextResponse.json({
      kit,
      products: items,
      itemCount: items.length,
      qrDataUrl,
    });
  } catch (err) {
    console.error('[API /api/kits/[code]] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch kit details' },
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
    const kitCode = decodeURIComponent(code).trim().toUpperCase();
    const body = await req.json();
    const { status } = body;

    if (!['open', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Status must be open or closed' }, { status: 400 });
    }

    const db = await getDb();
    const kitsColl = db.collection<Kit>('kits');

    const result = await kitsColl.findOneAndUpdate(
      { code: kitCode },
      { $set: { status, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'Kit not found' }, { status: 404 });
    }

    if (status === 'closed') {
      await logAudit(db, 'KIT_CLOSED', kitCode, 'kit', result._id?.toString());
    }

    return NextResponse.json({ success: true, kit: result });
  } catch (err) {
    console.error('[API PATCH /api/kits/[code]] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to update kit' },
      { status: 500 }
    );
  }
}
