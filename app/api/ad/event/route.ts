import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { query } from '@/lib/db';

const eventSchema = z.object({
  openid: z.string().optional(),
  adType: z.enum(['reward', 'banner', 'interstitial']),
  adUnitId: z.string().optional(),
  action: z.enum(['load', 'show', 'click', 'close', 'complete']),
  durationMs: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = eventSchema.parse(body);
    await query(
      `INSERT INTO ad_events (openid, ad_type, ad_unit_id, action, duration_ms)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        parsed.openid ?? null,
        parsed.adType,
        parsed.adUnitId ?? null,
        parsed.action,
        parsed.durationMs ?? null,
      ]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ ok: true }); // 埋点不阻塞主流程
  }
}
