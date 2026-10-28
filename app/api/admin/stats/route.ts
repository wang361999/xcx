import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const colCount = await sql.query(`SELECT count(*) as cnt FROM collections`);
    const pubCount = await sql.query(
      `SELECT count(*) as cnt FROM collections WHERE status = 'published'`
    );
    const imgCount = await sql.query(`SELECT count(*) as cnt FROM images`);
    const unlockCount = await sql.query(`SELECT count(*) as cnt FROM unlocks`);
    const rewardCount = await sql.query(
      `SELECT count(*) as cnt FROM ad_events WHERE ad_type = 'reward'`
    );

    return NextResponse.json({
      data: {
        collections: {
          total: Number(colCount.rows[0].cnt),
          published: Number(pubCount.rows[0].cnt),
        },
        images: { total: Number(imgCount.rows[0].cnt) },
        unlocks: { total: Number(unlockCount.rows[0].cnt) },
        ads: { rewardTotal: Number(rewardCount.rows[0].cnt) },
      },
    });
  } catch (err) {
    console.error('GET /api/admin/stats:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
