import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { collections } from '@/lib/schema';
import { inArray } from 'drizzle-orm';

const sortSchema = z.array(z.object({ id: z.number().int(), sortOrder: z.number().int() }));

export async function PUT(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;
  try {
    const parsed = sortSchema.parse(await req.json());
    for (const item of parsed) {
      await db.update(collections).set({ sortOrder: item.sortOrder }).where(inArray(collections.id, [item.id]));
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
