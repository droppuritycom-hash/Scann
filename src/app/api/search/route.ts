import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { normalizeScanInput, validateQRCode } from '@/lib/validation';
import { generateQRDataURL } from '@/lib/qr';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryRaw = searchParams.get('q') || '';
    const query = normalizeScanInput(queryRaw);

    if (!query) {
      return NextResponse.json({ results: null, message: 'Please enter a search code' });
    }

    const db = await getDb();
    const inventoryColl = db.collection('inventoryItems');
    const batchesColl = db.collection('batches');
    const kitsColl = db.collection('kits');
    const auditColl = db.collection('auditLogs');

    // 1. Check if it's a Batch code
    if (query.startsWith('BAT-')) {
      const batch = await batchesColl.findOne({ code: query });
      if (batch) {
        const products = await inventoryColl.find({ batchCode: query }).sort({ createdAt: -1 }).toArray();
        const qrDataUrl = await generateQRDataURL(query, 'batch');
        return NextResponse.json({
          type: 'batch',
          found: true,
          batch,
          products,
          productCount: products.length,
          qrDataUrl,
        });
      }
    }

    // 2. Check if it's a Kit code
    if (query.startsWith('KIT-')) {
      const kit = await kitsColl.findOne({ code: query });
      if (kit) {
        const products = await inventoryColl.find({ kitCode: query }).sort({ updatedAt: -1 }).toArray();
        const qrDataUrl = await generateQRDataURL(query, 'kit');
        return NextResponse.json({
          type: 'kit',
          found: true,
          kit,
          products,
          itemCount: products.length,
          qrDataUrl,
        });
      }
    }

    // 3. Check if it's an Inventory Serial
    const item = await inventoryColl.findOne({ serialCode: query });
    if (item) {
      const history = await auditColl.find({ code: query }).sort({ timestamp: -1 }).toArray();
      const qrDataUrl = await generateQRDataURL(query, 'serial');
      return NextResponse.json({
        type: 'serial',
        found: true,
        item,
        history,
        qrDataUrl,
      });
    }

    // 4. Try fuzzy or partial matches across collections
    const partialBatch = await batchesColl.findOne({ code: { $regex: query, $options: 'i' } });
    if (partialBatch) {
      const products = await inventoryColl.find({ batchCode: partialBatch.code }).sort({ createdAt: -1 }).toArray();
      const qrDataUrl = await generateQRDataURL(partialBatch.code, 'batch');
      return NextResponse.json({
        type: 'batch',
        found: true,
        batch: partialBatch,
        products,
        productCount: products.length,
        qrDataUrl,
      });
    }

    const partialKit = await kitsColl.findOne({ code: { $regex: query, $options: 'i' } });
    if (partialKit) {
      const products = await inventoryColl.find({ kitCode: partialKit.code }).sort({ updatedAt: -1 }).toArray();
      const qrDataUrl = await generateQRDataURL(partialKit.code, 'kit');
      return NextResponse.json({
        type: 'kit',
        found: true,
        kit: partialKit,
        products,
        itemCount: products.length,
        qrDataUrl,
      });
    }

    const partialSerial = await inventoryColl.findOne({ serialCode: { $regex: query, $options: 'i' } });
    if (partialSerial) {
      const history = await auditColl.find({ code: partialSerial.serialCode }).sort({ timestamp: -1 }).toArray();
      const qrDataUrl = await generateQRDataURL(partialSerial.serialCode, 'serial');
      return NextResponse.json({
        type: 'serial',
        found: true,
        item: partialSerial,
        history,
        qrDataUrl,
      });
    }

    return NextResponse.json({
      found: false,
      query,
      message: `No record found matching "${query}".`,
    });
  } catch (err) {
    console.error('[API /api/search] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to search' },
      { status: 500 }
    );
  }
}
