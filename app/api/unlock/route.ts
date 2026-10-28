import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ZodError, z } from 'zod';

const unlockSchema = z.object({
  openid: z.string().min(1),
  collectionId: z.number().int(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = unlockSchema.parse(body);

    const colResult = await query(
      `SELECT id FROM collections WHERE id = $1 LIMIT 1`,
      [parsed.collectionId]
    );
    if (!colResult.rows[0])
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });

    const existingResult = await query(
      `SELECT id FROM unlocks WHERE openid = $1 AND collection_id = $2 LIMIT 1`,
      [parsed.openid, parsed.collectionId]
    );
    if (existingResult.rows[0])
      return NextResponse.json({ data: { unlocked: true, already: true } });

    await query(
      `INSERT INTO unlocks (openid, collection_id) VALUES ($1, $2)`,
      [parsed.openid, parsed.collectionId]
    );
    return NextResponse.json({ data: { unlocked: true } });
  } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error('POST /api/unlock:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const openid = url.searchParams.get('openid');
    if (!openid)
      return NextResponse.json({ error: 'openid required' }, { status: 400 });

    const result = await query(
      `SELECT collection_id FROM unlocks WHERE openid = $1`,
      [openid]
    );

    return NextResponse.json({
      data: {
        unlockedCollectionIds: result.rows.map((r: any) => r.collection_id),
      },
    });
  } catch (err) {
    console.error('GET /api/unlock:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
