import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { validateQRCode } from '@/lib/validation';
import { logAudit } from '@/lib/audit';
import { InventoryItem, Batch, Product } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serialCode: rawSerial, batchCode: rawBatch, productId, action = 'add' } = body;

    // Validate serial format
    const serialValidation = validateQRCode(rawSerial, 'serial');
    if (!serialValidation.valid) {
      return NextResponse.json({ error: serialValidation.error }, { status: 400 });
    }
    const serialCode = serialValidation.normalizedCode;

    // Validate batch format
    const batchValidation = validateQRCode(rawBatch, 'batch');
    if (!batchValidation.valid) {
      return NextResponse.json({ error: batchValidation.error }, { status: 400 });
    }
    const batchCode = batchValidation.normalizedCode;

    const db = await getDb();
    const inventoryColl = db.collection<InventoryItem>('inventoryItems');
    const batchesColl = db.collection<Batch>('batches');
    const productsColl = db.collection<Product>('products');
    const qrColl = db.collection('qrCodes');

    // Check if serial is already in inventory
    const existingItem = await inventoryColl.findOne({ serialCode });
    if (existingItem) {
      // Duplicate detected!
      const isSameBatch = existingItem.batchCode === batchCode;
      await logAudit(db, 'DUPLICATE_SCAN', serialCode, 'serial', existingItem._id?.toString(), {
        attemptedBatch: batchCode,
        currentBatch: existingItem.batchCode,
        currentKit: existingItem.kitCode,
        reason: isSameBatch ? 'ALREADY_REGISTERED_IN_THIS_BATCH' : 'ALREADY_ASSIGNED_TO_OTHER_BATCH',
      });

      return NextResponse.json(
        {
          duplicate: true,
          error: isSameBatch
            ? 'This QR has already been registered in this batch.'
            : `This product is already assigned to batch ${existingItem.batchCode}.`,
          item: {
            serialCode: existingItem.serialCode,
            productName: existingItem.productName,
            partCode: existingItem.partCode,
            batchCode: existingItem.batchCode,
            kitCode: existingItem.kitCode,
            status: existingItem.status,
            createdAt: existingItem.createdAt,
          },
        },
        { status: 409 }
      );
    }

    // If just checking/verifying serial
    if (action === 'verify') {
      // Check if QR was generated and pre-associated with a product
      const qrRecord = await qrColl.findOne({ code: serialCode });
      let suggestedProduct = null;
      if (qrRecord?.productId) {
        suggestedProduct = await productsColl.findOne({
          _id: ObjectId.isValid(qrRecord.productId) ? new ObjectId(qrRecord.productId) : (qrRecord.productId as unknown as ObjectId),
        });
      }

      return NextResponse.json({
        success: true,
        available: true,
        serialCode,
        suggestedProduct,
      });
    }

    // Adding product to batch
    if (!productId) {
      return NextResponse.json(
        { error: 'Product must be selected before adding to batch' },
        { status: 400 }
      );
    }

    // Find product details
    const product = await productsColl.findOne(
      ObjectId.isValid(productId)
        ? { _id: new ObjectId(productId) }
        : { partCode: productId }
    );

    if (!product) {
      return NextResponse.json({ error: 'Selected product not found in master data' }, { status: 404 });
    }

    // Ensure batch exists
    let batch = await batchesColl.findOne({ code: batchCode });
    if (!batch) {
      const now = new Date().toISOString();
      const newBatch: Batch = {
        code: batchCode,
        baseCode: batchCode.replace(/^BAT-/, ''),
        status: 'open',
        productCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      const res = await batchesColl.insertOne(newBatch);
      batch = { ...newBatch, _id: res.insertedId };
    }

    const now = new Date().toISOString();
    const newItem: InventoryItem = {
      serialCode,
      productId: product._id?.toString() || productId,
      productName: product.name,
      partCode: product.partCode,
      category: product.category,
      batchId: batch._id?.toString() || '',
      batchCode,
      kitId: null,
      kitCode: null,
      status: 'in_batch',
      createdAt: now,
      updatedAt: now,
    };

    // Atomic insert with duplicate prevention enforced at DB unique index
    try {
      const insertResult = await inventoryColl.insertOne(newItem);
      const insertedItem = { ...newItem, _id: insertResult.insertedId };

      // Increment batch count atomically
      await batchesColl.updateOne(
        { code: batchCode },
        { $inc: { productCount: 1 }, $set: { updatedAt: now } }
      );

      // Mark QR as used in qrCodes collection if present, or upsert it
      await qrColl.updateOne(
        { code: serialCode },
        {
          $set: {
            code: serialCode,
            type: 'serial',
            status: 'registered',
            used: true,
            entityId: insertResult.insertedId.toString(),
            productId: product._id?.toString(),
            productName: product.name,
            usedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );

      // Audit log
      await logAudit(
        db,
        'PRODUCT_ADDED_TO_BATCH',
        serialCode,
        'serial',
        insertResult.insertedId.toString(),
        {
          productName: product.name,
          partCode: product.partCode,
          batchCode,
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Product Added Successfully',
        item: insertedItem,
      });
    } catch (insertErr: unknown) {
      // Duplicate key error (E11000) from concurrent scan race condition
      if (
        typeof insertErr === 'object' &&
        insertErr !== null &&
        'code' in insertErr &&
        (insertErr as { code: number }).code === 11000
      ) {
        const raceItem = await inventoryColl.findOne({ serialCode });
        await logAudit(db, 'DUPLICATE_SCAN', serialCode, 'serial', raceItem?._id?.toString(), {
          reason: 'CONCURRENT_INSERT_CONFLICT',
          batchCode,
        });

        return NextResponse.json(
          {
            duplicate: true,
            error: 'This QR was just registered by another device.',
            item: raceItem,
          },
          { status: 409 }
        );
      }
      throw insertErr;
    }
  } catch (err) {
    console.error('[API /api/scan/product] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to register product' },
      { status: 500 }
    );
  }
}
