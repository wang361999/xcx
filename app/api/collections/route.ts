import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { collections, images } from '@/lib/schema';
import { asc, eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const result = await db
      .select({
        id: collections.id,
        title: collections.title,
        description: collections.description,
        coverUrl: collections.coverUrl,
        sortOrder: collections.sortOrder,
      })
      .from(collections)
      .where(eq(collections.status, 'published'))
      .orderBy(asc(collections.sortOrder), asc(collections.id));

    const imageCounts = await db
      .select({
        collectionId: images.collectionId,
        count: sql<number>`count(*)` as any,
      })
      .from(images)
      .groupBy(images.collectionId);

    const countMap = new Map(imageCounts.map(r => [r.collectionId, Number(r.count)]));

    const list = result.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      coverUrl: row.coverUrl,
      sortOrder: row.sortOrder,
      imageCount: countMap.get(row.id) || 0,
    }));

    return NextResponse.json({ data: list });
  } catch (err) {
    console.error('GET /api/collections:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
