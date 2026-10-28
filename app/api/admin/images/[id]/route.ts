import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { deleteFile } from '@/lib/r2';

const updateSchema = z.object({
  title: z.string().nullable().optional(),
  copyright: z.string().nullable().optional(),
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const { id } = await params;
    const imageId = parseInt(id);
    const body = await req.json();
    const parsed = updateSchema.parse(body);

    const fieldMap: Record<string, any> = {
      title: parsed.title,
      copyright: parsed.copyright,
      sort_order: parsed.sortOrder,
    };
    const fields = Object.entries(fieldMap).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return NextResponse.json({ data: null });

    const sets = fields.map(([col], i) => `${col} = $${i + 1}`).join(', ');
    const values = fields.map(([, v]) => v);
    values.push(imageId);
    const result = await query(
      `UPDATE images SET ${sets} WHERE id = $${fields.length + 1} RETURNING *`,
      values
    );
    const img = result.rows[0];
    return NextResponse.json({ data: img ? mapImage(img) : null });
  } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
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
    const imageId = parseInt(id);
    const imgResult = await query(
      `SELECT * FROM images WHERE id = $1`,
      [imageId]
    );
    const image = imgResult.rows[0];
    await query(`DELETE FROM images WHERE id = $1`, [imageId]);
    if (image) deleteFile(image.r2_key);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/images/[id]:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
