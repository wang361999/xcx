import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';

export async function GET() {
  try {
    const all = await db.select().from(settings);
    const result: Record<string, any> = {};
    for (const s of all) result[s.key] = s.value;
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('GET /api/settings:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
