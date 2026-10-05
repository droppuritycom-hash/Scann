import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { AuditLog } from '@/types';

export async function GET() {
  try {
    const db = await getDb();
    const inventoryColl = db.collection('inventoryItems');
    const batchesColl = db.collection('batches');
    const kitsColl = db.collection('kits');
    const productsColl = db.collection('products');
    const auditColl = db.collection<AuditLog>('auditLogs');

    // Start of today in UTC
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const startOfTodayIso = startOfToday.toISOString();

    const [
      totalProducts,
      totalBatches,
      totalKits,
      totalInventoryItems,
      todayScans,
      unassignedProducts,
      productsInKits,
      recentActivity,
    ] = await Promise.all([
      productsColl.countDocuments({ active: true }),
      batchesColl.countDocuments(),
      kitsColl.countDocuments(),
      inventoryColl.countDocuments(),
      auditColl.countDocuments({
        timestamp: { $gte: startOfTodayIso },
        action: { $in: ['PRODUCT_ADDED_TO_BATCH', 'PRODUCT_ADDED_TO_KIT'] },
      }),
      inventoryColl.countDocuments({ kitCode: null }),
      inventoryColl.countDocuments({ kitCode: { $ne: null } }),
      auditColl.find().sort({ timestamp: -1 }).limit(10).toArray(),
    ]);

    return NextResponse.json({
      totalProducts,
      totalBatches,
      totalKits,
      totalInventoryItems,
      todayScans,
      unassignedProducts,
      productsInKits,
      recentActivity,
    });
  } catch (err) {
    console.error('[API /api/stats] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
