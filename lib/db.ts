/**
 * 数据库连接 - Neon serverless driver (Vercel Postgres 已迁移到 Neon)
 * 专门为 Serverless/Edge 环境设计
 * 返回值包装成 pg/postgres 标准格式 { rows: [...] }
 */
import { neon } from '@neondatabase/serverless';

let sql: any = null;

function getSql() {
  if (sql) return sql;
  
  const connectionString = process.env.POSTGRES_URL 
    || process.env.POSTGRES_PRISMA_URL 
    || process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('No Postgres connection string found. Set POSTGRES_URL env var.');
  }
  
  sql = neon(connectionString);
  return sql;
}

// 通用查询方法，包装成 { rows: [...] } 格式
export async function query(sqlText: string, params?: any[]) {
  const s = getSql();
  const rows = await s(sqlText, params);
  return { rows, rowCount: rows.length };
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
