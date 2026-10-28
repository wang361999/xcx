import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { collections, images } from '@/lib/schema';
import { asc, eq } from 'drizzle-orm';
import { deleteFile } from '@/lib/r2';

const updateSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().nullable().optional(),
  coverUrl: z.string().optional(),
  r2Key: z.string().optional(),
  sortOrder: z.number().int().optional(),
  status: z.enum(['published', 'draft']).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const { id } = await params;
    const collectionId = parseInt(id);
    const [collection] = await db.select().from(collections).where(eq(collections.id, collectionId)).limit(1);
    if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const imageList = await db.select().from(images).where(eq(images.collectionId, collectionId)).orderBy(asc(images.sortOrder), asc(images.id));
    return NextResponse.json({ data: { ...collection, images: imageList } });
  } catch (err) {
    console.error('GET /api/admin/collections/[id]:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const { id } = await params;
    const collectionId = parseInt(id);
    const body = await req.json();
    const parsed = updateSchema.parse(body);
    const [updated] = await db.update(collections).set({ ...parsed, updatedAt: new Date() }).where(eq(collections.id, collectionId)).returning();
    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error('PUT /api/admin/collections/[id]:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const { id } = await params;
    const collectionId = parseInt(id);
    const imageList = await db.select().from(images).where(eq(images.collectionId, collectionId));
    const [collection] = await db.select().from(collections).where(eq(collections.id, collectionId));
    await db.delete(collections).where(eq(collections.id, collectionId));
    if (collection) deleteFile(collection.r2Key);
    for (const img of imageList) deleteFile(img.r2Key);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/collections/[id]:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
