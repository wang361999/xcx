import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const collectionId = parseInt(id);
    if (isNaN(collectionId))
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const colResult = await query(
      `SELECT * FROM collections WHERE id = $1 AND status = 'published' LIMIT 1`,
      [collectionId]
    );
    const collection = colResult.rows[0];
    if (!collection)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const imgResult = await query(
      `SELECT * FROM images WHERE collection_id = $1 ORDER BY sort_order ASC, id ASC`,
      [collectionId]
    );

    const url = new URL(req.url);
    const openid = url.searchParams.get('openid');
    let isUnlocked = false;
    if (openid) {
      const unlockResult = await query(
        `SELECT id FROM unlocks WHERE openid = $1 AND collection_id = $2 LIMIT 1`,
        [openid, collectionId]
      );
      isUnlocked = unlockResult.rows.length > 0;
    }

    return NextResponse.json({
      data: {
        id: collection.id,
        title: collection.title,
        description: collection.description,
        coverUrl: collection.cover_url,
        images: imgResult.rows.map((img: any) => ({
          id: img.id,
          title: img.title,
          imageUrl: img.image_url,
          copyright: img.copyright,
        })),
        isUnlocked,
        // 解锁后才下发网盘下载信息
        downloadUrl: isUnlocked ? collection.download_url : null,
        downloadCode: isUnlocked ? collection.download_code : null,
      },
    });
  } catch (err) {
    console.error('GET /api/collections/[id]:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
