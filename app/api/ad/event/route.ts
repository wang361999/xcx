import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { adEvents } from '@/lib/schema';

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
    await db.insert(adEvents).values({
      openid: parsed.openid,
      adType: parsed.adType,
      adUnitId: parsed.adUnitId,
      action: parsed.action,
      durationMs: parsed.durationMs,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ ok: true }); // 埋点不阻塞主流程
  }
}
