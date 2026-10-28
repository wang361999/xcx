import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(
      `SELECT id, title, description, cover_url, sort_order
       FROM collections
       WHERE status = 'published'
       ORDER BY sort_order ASC, id ASC`
    );

    const imageCounts = await query(
      `SELECT collection_id, count(*) as cnt FROM images GROUP BY collection_id`
    );

    const countMap = new Map(
      imageCounts.rows.map((r: any) => [r.collection_id, Number(r.cnt)])
    );

    const list = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      coverUrl: row.cover_url,
      sortOrder: row.sort_order,
      imageCount: countMap.get(row.id) || 0,
    }));

    return NextResponse.json({ data: list });
  } catch (err) {
    console.error('GET /api/collections:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
