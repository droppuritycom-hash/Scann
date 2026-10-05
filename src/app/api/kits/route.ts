import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Filter } from 'mongodb';
import { Kit } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') || '';
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);

    const query: Filter<Kit> = {};
    if (search) {
      query.code = { $regex: search, $options: 'i' };
    }
    if (status) {
      query.status = status as Kit['status'];
    }

    const db = await getDb();
    const kitsColl = db.collection<Kit>('kits');

    const total = await kitsColl.countDocuments(query);
    const kits = await kitsColl
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      kits,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    console.error('[API /api/kits] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch kits' },
      { status: 500 }
    );
  }
}
