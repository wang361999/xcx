import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { unlocks, collections } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { ZodError, z } from 'zod';

const unlockSchema = z.object({
  openid: z.string().min(1),
  collectionId: z.number().int(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = unlockSchema.parse(body);

    const [collection] = await db.select().from(collections).where(eq(collections.id, parsed.collectionId)).limit(1);
    if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });

    const [existing] = await db
      .select()
      .from(unlocks)
      .where(and(eq(unlocks.openid, parsed.openid), eq(unlocks.collectionId, parsed.collectionId)))
      .limit(1);
    if (existing) return NextResponse.json({ data: { unlocked: true, already: true } });

    await db.insert(unlocks).values({ openid: parsed.openid, collectionId: parsed.collectionId });
    return NextResponse.json({ data: { unlocked: true } });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error('POST /api/unlock:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const openid = url.searchParams.get('openid');
    if (!openid) return NextResponse.json({ error: 'openid required' }, { status: 400 });

    const list = await db
      .select({ collectionId: unlocks.collectionId })
      .from(unlocks)
      .where(eq(unlocks.openid, openid));

    return NextResponse.json({ data: { unlockedCollectionIds: list.map(r => r.collectionId) } });
  } catch (err) {
    console.error('GET /api/unlock:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
