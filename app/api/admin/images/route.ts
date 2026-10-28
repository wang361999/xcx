import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

const createSchema = z.object({
  collectionId: z.number().int(),
  title: z.string().optional().nullable(),
  imageUrl: z.string().min(1),
  r2Key: z.string().min(1),
  copyright: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

function mapImage(img: any) {
  return {
    id: img.id,
    collectionId: img.collection_id,
    title: img.title,
    imageUrl: img.image_url,
    r2Key: img.r2_key,
    copyright: img.copyright,
    sortOrder: img.sort_order,
    createdAt: img.created_at,
  };
}

export async function POST(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const items = (Array.isArray(body) ? body : [body]).map((b) =>
      createSchema.parse(b)
    );

    const placeholders: string[] = [];
    const values: any[] = [];
    items.forEach((item, i) => {
      const base = i * 6;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`
      );
      values.push(
        item.collectionId,
        item.title ?? null,
        item.imageUrl,
        item.r2Key,
        item.copyright ?? null,
        item.sortOrder ?? 0
      );
    });

    const result = await query(
      `INSERT INTO images (collection_id, title, image_url, r2_key, copyright, sort_order)
       VALUES ${placeholders.join(', ')}
       RETURNING *`,
      values
    );

    return NextResponse.json({ data: result.rows.map(mapImage) });
  } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error('POST /api/admin/images:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
