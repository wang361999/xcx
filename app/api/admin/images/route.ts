import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { images } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { deleteFile } from '@/lib/r2';

const createSchema = z.object({
  collectionId: z.number().int(),
  title: z.string().optional().nullable(),
  imageUrl: z.string().min(1),
  r2Key: z.string().min(1),
  copyright: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      const all = body.map(b => createSchema.parse(b));
      const created = await db.insert(images).values(all).returning();
      return NextResponse.json({ data: created });
    } else {
      const parsed = createSchema.parse(body);
      const [created] = await db.insert(images).values(parsed).returning();
      return NextResponse.json({ data: created });
    }
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error('POST /api/admin/images:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
