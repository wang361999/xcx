import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  coverUrl: z.string().min(1),
  r2Key: z.string().min(1),
  sortOrder: z.number().int().optional(),
  status: z.enum(['published', 'draft']).optional(),
});

function mapCollection(c: any) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    coverUrl: c.cover_url,
    r2Key: c.r2_key,
    sortOrder: c.sort_order,
    status: c.status,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

export async function GET(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const result = await query(
      `SELECT * FROM collections ORDER BY sort_order ASC, id ASC`
    );
    const counts = await query(
      `SELECT collection_id, count(*) as cnt FROM images GROUP BY collection_id`
    );
    const countMap = new Map(
      counts.rows.map((r: any) => [r.collection_id, Number(r.cnt)])
    );
    return NextResponse.json({
      data: result.rows.map((c: any) => ({
        ...mapCollection(c),
        imageCount: countMap.get(c.id) || 0,
      })),
    });
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
    const sortOrder = parsed.sortOrder ?? 0;
    const status = parsed.status ?? 'published';
    const result = await query(
      `INSERT INTO collections (title, description, cover_url, r2_key, sort_order, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        parsed.title,
        parsed.description ?? null,
        parsed.coverUrl,
        parsed.r2Key,
        sortOrder,
        status,
      ]
    );
    const c = result.rows[0];
    return NextResponse.json({ data: c ? mapCollection(c) : null });
  } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error('POST /api/admin/collections:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
