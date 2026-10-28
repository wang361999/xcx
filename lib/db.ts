/**
 * 数据库连接 - 直接用 @vercel/postgres 原生查询
 * 不走 drizzle，零兼容问题
 */
import { sql } from '@vercel/postgres';

export { sql };

export async function testConnection() {
  try {
    const result = await sql.query('SELECT 1 as ok');
    return { ok: true, row: result.rows[0] };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}
