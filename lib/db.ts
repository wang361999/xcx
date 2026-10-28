/**
 * 数据库连接 - 标准 pg 驱动（Prisma Postgres / 任何标准 Postgres 都适用）
 * pg 通过 serverExternalPackages 排除出打包，避免 Turbopack 解析 Node 内置模块失败
 */
import { Pool } from 'pg';

let pool: Pool | null = null;

function getConnectionString(): string {
  const url =
    process.env.POSTGRES_URL ||
    process.env.PRISMA_DATABASE_URL ||
    process.env.DATABASE_URL;

  if (!url) {
    throw new Error('数据库连接串未配置（POSTGRES_URL / DATABASE_URL）');
  }
  return url;
}

function getPool(): Pool {
  if (pool) return pool;

  const connectionString = getConnectionString();

  pool = new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    // Prisma Postgres 强制 SSL；本地/未声明时交给连接串自身参数决定
    ssl: /sslmode=disable/.test(connectionString)
      ? false
      : connectionString.includes('sslmode=')
        ? undefined
        : { rejectUnauthorized: false },
  });

  return pool;
}

// 统一查询方法，返回 { rows, rowCount }
export async function query(sqlText: string, params?: any[]) {
  const p = getPool();
  return p.query(sqlText, params);
}

export async function testConnection() {
  try {
    const result = await query('SELECT 1 as ok');
    return { ok: true, row: result.rows[0] };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}
