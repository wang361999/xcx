import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const all = await db.select().from(settings);
    const result: Record<string, any> = {};
    for (const s of all) result[s.key] = s.value;
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('GET /api/admin/settings:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    for (const [key, value] of Object.entries(body)) {
      await db
        .insert(settings)
        .values({ key, value: value as any })
        .onConflictDoUpdate({ target: settings.key, set: { value: value as any } });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/admin/settings:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
