import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { collections, images, unlocks } from '@/lib/schema';
import { asc, eq, and } from 'drizzle-orm';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const collectionId = parseInt(id);
    if (isNaN(collectionId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const [collection] = await db
      .select()
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.status, 'published')))
      .limit(1);
    if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const imageList = await db
      .select()
      .from(images)
      .where(eq(images.collectionId, collectionId))
      .orderBy(asc(images.sortOrder), asc(images.id));

    const url = new URL(req.url);
    const openid = url.searchParams.get('openid');
    let isUnlocked = false;
    if (openid) {
      const [unlock] = await db
        .select()
        .from(unlocks)
        .where(and(eq(unlocks.openid, openid), eq(unlocks.collectionId, collectionId)))
        .limit(1);
      isUnlocked = !!unlock;
    }

    return NextResponse.json({
      data: {
        id: collection.id,
        title: collection.title,
        description: collection.description,
        coverUrl: collection.coverUrl,
        images: imageList.map(img => ({
          id: img.id,
          title: img.title,
          imageUrl: img.imageUrl,
          copyright: img.copyright,
        })),
        isUnlocked,
      },
    });
  } catch (err) {
    console.error('GET /api/collections/[id]:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
