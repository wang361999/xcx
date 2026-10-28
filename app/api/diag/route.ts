import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { neon } = await import('@neondatabase/serverless');
    
    const connectionString = process.env.POSTGRES_URL 
      || process.env.POSTGRES_PRISMA_URL 
      || process.env.DATABASE_URL;

    // 解析连接字符串，只保留 host/dbname（隐藏密码）
    let maskedUrl = null;
    if (connectionString) {
      try {
        const url = new URL(connectionString);
        maskedUrl = `${url.protocol}//${url.host}/${url.pathname}`;
      } catch {
        maskedUrl = connectionString.replace(/\/\/.*@/, '//***@');
      }
    }

    if (!connectionString) {
      return NextResponse.json({ 
        ok: false, 
        error: 'No connection string found',
        env_vars: {
          POSTGRES_URL: process.env.POSTGRES_URL ? 'SET' : 'MISSING',
          POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL ? 'SET' : 'MISSING',
          DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
        }
      });
    }

    const sql = neon(connectionString);
    
    // 尝试列所有表
    try {
      const tables = await sql.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);
      
      return NextResponse.json({ 
        ok: true, 
        url: maskedUrl,
        tables: tables.map((t: any) => t.tablename),
        tableCount: tables.length
      });
    } catch (e: any) {
      return NextResponse.json({ 
        ok: false, 
        url: maskedUrl,
        error: e?.message || String(e)
      });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) });
  }
}
