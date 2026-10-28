import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { collections, images } from '@/lib/schema';
import { asc, eq } from 'drizzle-orm';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  coverUrl: z.string().min(1),
  r2Key: z.string().min(1),
  sortOrder: z.number().int().optional(),
  status: z.enum(['published', 'draft']).optional(),
});

export async function GET(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const result = await db.select().from(collections).orderBy(asc(collections.sortOrder), asc(collections.id));
    const counts = await db
      .select({ collectionId: images.collectionId, count: images.id })
      .from(images)
      .groupBy(images.collectionId);
    const countMap = new Map(counts.map(r => [r.collectionId, (r.count as unknown as number)]));
    return NextResponse.json({ data: result.map(c => ({ ...c, imageCount: countMap.get(c.id) || 0 })) });
  } catch (err) {
    console.error('GET /api/admin/collections:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const parsed = createSchema.parse(body);
    const [created] = await db.insert(collections).values({
      title: parsed.title,
      description: parsed.description,
      coverUrl: parsed.coverUrl,
      r2Key: parsed.r2Key,
      sortOrder: parsed.sortOrder ?? 0,
      status: parsed.status ?? 'published',
    }).returning();
    return NextResponse.json({ data: created });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error('POST /api/admin/collections:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
