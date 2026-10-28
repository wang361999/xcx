import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const result = await query(`SELECT key, value FROM settings`);
    const settings: Record<string, any> = {};
    for (const s of result.rows) settings[s.key] = s.value;
    return NextResponse.json({ data: settings });
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
      await query(
        `INSERT INTO settings (key, value)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, JSON.stringify(value)]
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/admin/settings:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
