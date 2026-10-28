import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const url =
      process.env.POSTGRES_URL ||
      process.env.PRISMA_DATABASE_URL ||
      process.env.DATABASE_URL;

    if (!url) {
      return NextResponse.json({
        ok: false,
        error: '未找到数据库连接串环境变量',
        envs: {
          POSTGRES_URL: !!process.env.POSTGRES_URL,
          PRISMA_DATABASE_URL: !!process.env.PRISMA_DATABASE_URL,
          DATABASE_URL: !!process.env.DATABASE_URL,
        },
      });
    }

    // 只暴露脱敏后的主机与库名
    let host = '?';
    let dbname = '?';
    try {
      const u = new URL(url);
      host = `${u.hostname}:${u.port || '5432'}`;
      dbname = u.pathname.replace(/^\//, '') || '(default)';
    } catch {
      /* ignore */
    }

    const tables = await query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );

    return NextResponse.json({
      ok: true,
      host,
      dbname,
      tableCount: tables.rows.length,
      tables: tables.rows.map((r: any) => r.tablename),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
