import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { validateQRCode } from '@/lib/validation';
import { logAudit } from '@/lib/audit';
import { InventoryItem, Kit } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { kitCode: rawKit, serialCode: rawSerial, action = 'add' } = body;

    // Validate kit code
    const kitValidation = validateQRCode(rawKit, 'kit');
    if (!kitValidation.valid) {
      return NextResponse.json({ error: kitValidation.error }, { status: 400 });
    }
    const kitCode = kitValidation.normalizedCode;

    // Validate serial code
    const serialValidation = validateQRCode(rawSerial, 'serial');
    if (!serialValidation.valid) {
      return NextResponse.json({ error: serialValidation.error }, { status: 400 });
    }
    const serialCode = serialValidation.normalizedCode;

    const db = await getDb();
    const inventoryColl = db.collection<InventoryItem>('inventoryItems');
    const kitsColl = db.collection<Kit>('kits');

    // 1. Check if kit exists
    const kit = await kitsColl.findOne({ code: kitCode });
    if (!kit) {
      return NextResponse.json(
        { error: `Kit ${kitCode} does not exist. Please scan a valid kit first.` },
        { status: 404 }
      );
    }

    // 2. Check if product exists in inventory (Rule 9: must already exist from a batch)
    const existingItem = await inventoryColl.findOne({ serialCode });
    if (!existingItem) {
      await logAudit(db, 'INVALID_QR_SCAN', serialCode, 'serial', null, {
        reason: 'PRODUCT_NOT_IN_INVENTORY_FOR_KIT',
        attemptedKit: kitCode,
      });

      return NextResponse.json(
        {
          error: `Product serial ${serialCode} not found in inventory. Products must first be registered inside a batch before being added to a kit.`,
        },
        { status: 404 }
      );
    }

    // 3. Check if already assigned to a kit (Rule 10: duplicate kit prevention)
    if (existingItem.kitCode) {
      await logAudit(
        db,
        'KIT_ASSIGNMENT_REJECTED',
        serialCode,
        'serial',
        existingItem._id?.toString(),
        {
          attemptedKit: kitCode,
          currentKit: existingItem.kitCode,
          productName: existingItem.productName,
        }
      );

      return NextResponse.json(
        {
          duplicate: true,
          error: `⚠ Already Assigned To Kit`,
          serialCode,
          productName: existingItem.productName,
          currentKit: existingItem.kitCode,
          currentBatch: existingItem.batchCode,
          item: existingItem,
        },
        { status: 409 }
      );
    }

    // If verifying only
    if (action === 'verify') {
      return NextResponse.json({
        success: true,
        available: true,
        item: {
          serialCode: existingItem.serialCode,
          productName: existingItem.productName,
          partCode: existingItem.partCode,
          batchCode: existingItem.batchCode,
          createdAt: existingItem.createdAt,
        },
      });
    }

    // 4. Atomic assignment using findOneAndUpdate with kitCode: null
    // This prevents race condition if two kit builders scan the same serial simultaneously!
    const now = new Date().toISOString();
    const updateResult = await inventoryColl.findOneAndUpdate(
      {
        serialCode,
        kitCode: null, // Critical concurrency guard
      },
      {
        $set: {
          kitId: kit._id?.toString() || '',
          kitCode,
          status: 'in_kit',
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );

    if (!updateResult) {
      // Another request won the race
      const conflictItem = await inventoryColl.findOne({ serialCode });
      return NextResponse.json(
        {
          duplicate: true,
          error: `Product ${serialCode} was just assigned to kit ${conflictItem?.kitCode} by another worker.`,
          item: conflictItem,
        },
        { status: 409 }
      );
    }

    // 5. Increment kit itemCount atomically
    await kitsColl.updateOne(
      { code: kitCode },
      { $inc: { itemCount: 1 }, $set: { updatedAt: now } }
    );

    // 6. Log audit
    await logAudit(
      db,
      'PRODUCT_ADDED_TO_KIT',
      serialCode,
      'serial',
      updateResult._id?.toString(),
      {
        kitCode,
        productName: updateResult.productName,
        batchCode: updateResult.batchCode,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Product ${serialCode} added to kit ${kitCode}`,
      item: updateResult,
    });
  } catch (err) {
    console.error('[API /api/kit/add-item] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to add item to kit' },
      { status: 500 }
    );
  }
}
