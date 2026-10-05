import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { QRCodeRecord } from '@/types';
import { generateQRDataURL } from '@/lib/qr';
import { normalizeScanInput, validateQRCode } from '@/lib/validation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const normalized = normalizeScanInput(decodeURIComponent(code));

    const db = await getDb();
    const qrColl = db.collection<QRCodeRecord>('qrCodes');
    const inventoryColl = db.collection('inventoryItems');

    const qr = await qrColl.findOne({ code: normalized });
    const inventoryItem = await inventoryColl.findOne({ serialCode: normalized });

    const validation = validateQRCode(normalized);
    const dataUrl = validation.valid
      ? await generateQRDataURL(normalized, validation.type !== 'unknown' ? validation.type : 'serial')
      : null;

    return NextResponse.json({
      code: normalized,
      found: !!qr || !!inventoryItem,
      qr,
      inventoryItem,
      dataUrl,
    });
  } catch (err) {
    console.error('[API /api/qr/[code]] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch QR details' },
      { status: 500 }
    );
  }
}
