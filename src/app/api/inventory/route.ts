import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Filter } from 'mongodb';
import { InventoryItem } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const category = searchParams.get('category') || '';
    const batch = searchParams.get('batch') || '';
    const kit = searchParams.get('kit') || '';
    const status = searchParams.get('status') || '';
    const sort = searchParams.get('sort') || 'desc';
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '25', 10), 1), 100);

    const query: Filter<InventoryItem> = {};

    if (search) {
      query.$or = [
        { serialCode: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
        { partCode: { $regex: search, $options: 'i' } },
        { batchCode: { $regex: search, $options: 'i' } },
        { kitCode: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (batch) {
      query.batchCode = batch;
    }

    if (kit) {
      query.kitCode = kit;
    }

    if (status) {
      query.status = status as InventoryItem['status'];
    }

    const db = await getDb();
    const inventoryColl = db.collection<InventoryItem>('inventoryItems');

    const total = await inventoryColl.countDocuments(query);
    const items = await inventoryColl
      .find(query)
      .sort({ createdAt: sort === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    console.error('[API /api/inventory] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}
