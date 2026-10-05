import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Filter, ObjectId } from 'mongodb';
import { Product } from '@/types';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const category = searchParams.get('category') || '';
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '200', 10), 1), 500);

    const query: Filter<Product> = {};
    if (activeOnly) {
      query.active = true;
    }
    if (category) {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { partCode: { $regex: search, $options: 'i' } },
      ];
    }

    const db = await getDb();
    const productsColl = db.collection<Product>('products');

    const products = await productsColl
      .find(query)
      .sort({ itemNumber: 1, name: 1 })
      .limit(limit)
      .toArray();

    // Distinct categories for quick filtering
    const categories = await productsColl.distinct('category');

    return NextResponse.json({
      products,
      categories: categories.sort(),
      total: products.length,
    });
  } catch (err) {
    console.error('[API /api/products] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, partCode, category, unit = 'Pcs', hsn = null, gst = 18, active = true } = body;

    if (!name || !partCode || !category) {
      return NextResponse.json(
        { error: 'Name, partCode, and category are required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const productsColl = db.collection<Product>('products');
    const now = new Date().toISOString();

    if (id) {
      // Edit existing product
      const existing = await productsColl.findOne({
        _id: new ObjectId(id),
      });
      if (!existing) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      // Check partCode uniqueness if changed
      if (partCode !== existing.partCode) {
        const conflict = await productsColl.findOne({ partCode });
        if (conflict) {
          return NextResponse.json(
            { error: `Part code "${partCode}" is already in use by another product.` },
            { status: 409 }
          );
        }
      }

      await productsColl.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            name,
            partCode,
            category,
            unit,
            hsn: hsn || null,
            gst: Number(gst) || 18,
            active: Boolean(active),
            updatedAt: now,
          },
        }
      );

      await logAudit(db, 'PRODUCT_UPDATED', partCode, 'product', id, { name });

      return NextResponse.json({ success: true, message: 'Product updated successfully' });
    } else {
      // Add new product
      const conflict = await productsColl.findOne({ partCode });
      if (conflict) {
        return NextResponse.json(
          { error: `Part code "${partCode}" already exists. Duplicate part codes are not allowed.` },
          { status: 409 }
        );
      }

      const count = await productsColl.countDocuments();
      const newProduct: Product = {
        itemNumber: count + 1,
        name,
        partCode,
        category,
        unit,
        hsn: hsn || null,
        gst: Number(gst) || 18,
        active: Boolean(active),
        createdAt: now,
        updatedAt: now,
      };

      const insertRes = await productsColl.insertOne(newProduct);
      await logAudit(db, 'PRODUCT_CREATED', partCode, 'product', insertRes.insertedId.toString(), { name });

      return NextResponse.json({
        success: true,
        message: 'Product added successfully',
        product: { ...newProduct, _id: insertRes.insertedId },
      });
    }
  } catch (err) {
    console.error('[API POST /api/products] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to save product' },
      { status: 500 }
    );
  }
}
