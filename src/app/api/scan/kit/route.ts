import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { validateQRCode } from '@/lib/validation';
import { logAudit } from '@/lib/audit';
import { Kit } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    const validation = validateQRCode(code, 'kit');
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const kitCode = validation.normalizedCode;
    const db = await getDb();
    const kitsColl = db.collection<Kit>('kits');
    const inventoryColl = db.collection('inventoryItems');

    // Find or create kit
    let kit = await kitsColl.findOne({ code: kitCode });
    if (!kit) {
      const now = new Date().toISOString();
      const newKit: Kit = {
        code: kitCode,
        status: 'open',
        itemCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      try {
        const insertRes = await kitsColl.insertOne(newKit);
        kit = { ...newKit, _id: insertRes.insertedId };
        await logAudit(db, 'KIT_CLOSED' as const, kitCode, 'kit', insertRes.insertedId.toString(), {
          autoCreatedOnScan: true,
        });
      } catch (insertErr: unknown) {
        if (typeof insertErr === 'object' && insertErr !== null && 'code' in insertErr && (insertErr as { code: number }).code === 11000) {
          kit = await kitsColl.findOne({ code: kitCode });
        } else {
          throw insertErr;
        }
      }
    }

    // Get current products in this kit
    const items = await inventoryColl
      .find({ kitCode })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      kit,
      products: items,
      itemCount: items.length,
    });
  } catch (err) {
    console.error('[API /api/scan/kit] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to process kit scan' },
      { status: 500 }
    );
  }
}
