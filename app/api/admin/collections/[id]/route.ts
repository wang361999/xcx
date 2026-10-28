import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { deleteFile } from '@/lib/r2';

const updateSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().nullable().optional(),
  coverUrl: z.string().optional(),
  r2Key: z.string().optional(),
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const { id } = await params;
    const collectionId = parseInt(id);
    const colResult = await sql.query(
      `SELECT * FROM collections WHERE id = $1 LIMIT 1`,
      [collectionId]
    );
    const collection = colResult.rows[0];
    if (!collection)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const imgResult = await sql.query(
      `SELECT * FROM images WHERE collection_id = $1 ORDER BY sort_order ASC, id ASC`,
      [collectionId]
    );
    return NextResponse.json({
      data: {
        ...mapCollection(collection),
        images: imgResult.rows.map(mapImage),
      },
    });
  } catch (err) {
    console.error('GET /api/admin/collections/[id]:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const { id } = await params;
    const collectionId = parseInt(id);
    const body = await req.json();
    const parsed = updateSchema.parse(body);

    const fieldMap: Record<string, any> = {
      title: parsed.title,
      description: parsed.description,
      cover_url: parsed.coverUrl,
      r2_key: parsed.r2Key,
      sort_order: parsed.sortOrder,
      status: parsed.status,
    };
    const fields = Object.entries(fieldMap).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return NextResponse.json({ data: null });

    const sets = fields.map(([col], i) => `${col} = $${i + 1}`).join(', ');
    const values = fields.map(([, v]) => v);
    values.push(new Date(), collectionId);
    const result = await sql.query(
      `UPDATE collections SET ${sets}, updated_at = $${fields.length + 1}
       WHERE id = $${fields.length + 2} RETURNING *`,
      values
    );
    const c = result.rows[0];
    return NextResponse.json({ data: c ? mapCollection(c) : null });
  } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error('PUT /api/admin/collections/[id]:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const { id } = await params;
    const collectionId = parseInt(id);

    const colResult = await sql.query(
      `SELECT * FROM collections WHERE id = $1 LIMIT 1`,
      [collectionId]
    );
    const collection = colResult.rows[0];
    const imgResult = await sql.query(
      `SELECT * FROM images WHERE collection_id = $1`,
      [collectionId]
    );

    await sql.query(`DELETE FROM collections WHERE id = $1`, [collectionId]);
    if (collection) deleteFile(collection.r2_key);
    for (const img of imgResult.rows) deleteFile(img.r2_key);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/collections/[id]:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
