import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { images } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { deleteFile } from '@/lib/r2';

const updateSchema = z.object({
  title: z.string().nullable().optional(),
  copyright: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireAdmin(req);
  if (authError) return authError;
  try {
    const { id } = await params;
    const imageId = parseInt(id);
    const body = await req.json();
    const parsed = updateSchema.parse(body);
    const [updated] = await db.update(images).set(parsed).where(eq(images.id, imageId)).returning();
    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireAdmin(req);
  if (authError) return authError;
  try {
    const { id } = await params;
    const imageId = parseInt(id);
    const [image] = await db.select().from(images).where(eq(images.id, imageId));
    await db.delete(images).where(eq(images.id, imageId));
    if (image) deleteFile(image.r2Key);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/images/[id]:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
