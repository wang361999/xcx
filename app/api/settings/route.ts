import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(`SELECT key, value FROM settings`);
    const settings: Record<string, any> = {};
    for (const s of result.rows) settings[s.key] = s.value;
    return NextResponse.json({ data: settings });
  } catch (err) {
    console.error('GET /api/settings:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
