/**
 * 数据库连接 - 兼容 direct + pooled 两种连接字符串
 */
import { createClient } from '@vercel/postgres';

let client: any = null;

function getClient() {
  if (!client) {
    const connectionString = process.env.POSTGRES_URL 
      || process.env.POSTGRES_PRISMA_URL 
      || process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('No Postgres connection string found. Set POSTGRES_URL env var.');
    }
    
    client = createClient({ connectionString });
  }
  return client;
}

// 通用查询方法
export async function query(sqlText: string, params?: any[]) {
  const c = getClient();
  return c.query(sqlText, params);
}

// 测试连接
export async function testConnection() {
  try {
    const result = await query('SELECT 1 as ok');
    return { ok: true, row: result.rows[0] };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}
