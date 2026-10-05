import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { InventoryItem } from '@/types';
import { generateQRDataURL } from '@/lib/qr';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ serial: string }> }
) {
  try {
    const { serial } = await params;
    const serialCode = decodeURIComponent(serial).trim().toUpperCase();

    const db = await getDb();
    const inventoryColl = db.collection<InventoryItem>('inventoryItems');
    const auditColl = db.collection('auditLogs');

    const item = await inventoryColl.findOne({ serialCode });
    if (!item) {
      return NextResponse.json(
        { error: `Serial ${serialCode} not found in inventory` },
        { status: 404 }
      );
    }

    // Get audit history for this serial
    const history = await auditColl
      .find({ code: serialCode })
      .sort({ timestamp: -1 })
      .toArray();

    // Generate QR data URL for preview
    const qrDataUrl = await generateQRDataURL(serialCode, 'serial');

    return NextResponse.json({
      item,
      qrDataUrl,
      history,
    });
  } catch (err) {
    console.error('[API /api/inventory/[serial]] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch serial details' },
      { status: 500 }
    );
  }
}
