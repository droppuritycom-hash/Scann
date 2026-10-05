import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { allocateSequentialCodes } from '@/lib/sequence';
import { generateQRDataURL } from '@/lib/qr';
import { logAudit } from '@/lib/audit';
import { EntityType, Product, QRCodeRecord } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, quantity = 1, productId } = body;

    if (!type || !['serial', 'batch', 'kit'].includes(type)) {
      return NextResponse.json(
        { error: 'Valid type (serial, batch, kit) is required' },
        { status: 400 }
      );
    }

    const qty = Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 500);

    const db = await getDb();
    const productsColl = db.collection<Product>('products');
    const qrColl = db.collection<QRCodeRecord>('qrCodes');

    let product: Product | null = null;
    if (productId && type === 'serial') {
      product = await productsColl.findOne(
        ObjectId.isValid(productId)
          ? { _id: new ObjectId(productId) }
          : { partCode: productId }
      );
    }

    // 1. Atomically allocate consecutive sequential codes from MongoDB
    const codes = await allocateSequentialCodes(db, type as EntityType, qty);

    const now = new Date().toISOString();
    const qrRecords: QRCodeRecord[] = [];
    const responseItems: Array<{
      code: string;
      type: EntityType;
      dataUrl: string;
      productName?: string | null;
      partCode?: string | null;
    }> = [];

    // 2. Generate exact QR payload and image for each code
    for (const code of codes) {
      const dataUrl = await generateQRDataURL(code, type as EntityType);

      qrRecords.push({
        code,
        type: type as EntityType,
        status: 'generated',
        used: false,
        entityId: null,
        productId: product?._id?.toString() || null,
        productName: product?.name || null,
        createdAt: now,
      });

      responseItems.push({
        code,
        type: type as EntityType,
        dataUrl,
        productName: product?.name || null,
        partCode: product?.partCode || null,
      });
    }

    // 3. Save records in MongoDB QR registry
    if (qrRecords.length > 0) {
      await qrColl.insertMany(qrRecords);
    }

    // 4. Log audit
    await logAudit(
      db,
      'QR_GENERATED',
      codes[0] + (codes.length > 1 ? ` - ${codes[codes.length - 1]}` : ''),
      type as EntityType,
      null,
      {
        count: codes.length,
        type,
        productId: product?._id?.toString(),
        productName: product?.name,
      }
    );

    return NextResponse.json({
      success: true,
      count: responseItems.length,
      type,
      items: responseItems,
    });
  } catch (err) {
    console.error('[API /api/qr/generate] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to generate QR codes' },
      { status: 500 }
    );
  }
}
