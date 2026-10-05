import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Filter } from 'mongodb';
import { Batch } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') || '';
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);

    const query: Filter<Batch> = {};
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { baseCode: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) {
      query.status = status as Batch['status'];
    }

    const db = await getDb();
    const batchesColl = db.collection<Batch>('batches');

    const total = await batchesColl.countDocuments(query);
    const batches = await batchesColl
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      batches,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    console.error('[API /api/batches] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch batches' },
      { status: 500 }
    );
  }
}
