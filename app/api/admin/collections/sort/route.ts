import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

const sortSchema = z.array(
  z.object({ id: z.number().int(), sortOrder: z.number().int() })
);

export async function PUT(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const parsed = sortSchema.parse(await req.json());
    for (const item of parsed) {
      await sql.query(
        `UPDATE collections SET sort_order = $1 WHERE id = $2`,
        [item.sortOrder, item.id]
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
