import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { collections, images, unlocks, adEvents } from '@/lib/schema';
import { sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const [collectionCount] = await db.select({ count: sql<number>`count(*)` }).from(collections);
    const [publishedCount] = await db.select({ count: sql<number>`count(*)` }).from(collections).where(sql`status = 'published'`);
    const [imageCount] = await db.select({ count: sql<number>`count(*)` }).from(images);
    const [unlockCount] = await db.select({ count: sql<number>`count(*)` }).from(unlocks);
    const [adRewardCount] = await db.select({ count: sql<number>`count(*)` }).from(adEvents).where(sql`ad_type = 'reward'`);

    return NextResponse.json({
      data: {
        collections: { total: Number(collectionCount.count), published: Number(publishedCount.count) },
        images: { total: Number(imageCount.count) },
        unlocks: { total: Number(unlockCount.count) },
        ads: { rewardTotal: Number(adRewardCount.count) },
      },
    });
  } catch (err) {
    console.error('GET /api/admin/stats:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
