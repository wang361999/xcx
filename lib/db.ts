/**
 * 数据库连接 - 用 pg 原生驱动，支持连接超时
 */
import { Client } from 'pg';

let client: Client | null = null;
let connecting = false;
let connectPromise: Promise<Client> | null = null;

function getConnectionString(): string | null {
  return process.env.POSTGRES_URL 
    || process.env.POSTGRES_PRISMA_URL 
    || process.env.DATABASE_URL 
    || null;
}

async function getClient(): Promise<Client> {
  if (client && client.readyForQuery) return client;
  if (connecting && connectPromise) return connectPromise;

  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error('No Postgres connection string found');
  }

  connecting = true;
  connectPromise = new Promise<Client>((resolve, reject) => {
    const c = new Client({
      connectionString,
      connectionTimeoutMillis: 5000, // 5秒超时
      query_timeout: 10000,
    });
    
    c.connect((err) => {
      connecting = false;
      if (err) {
        console.error('[DB] connect failed:', err.message);
        client = null;
        connectPromise = null;
        reject(err);
        return;
      }
      console.log('[DB] connected');
      client = c;
      resolve(c);
    });
  });

  try {
    const c = await connectPromise;
    connectPromise = null;
    return c;
  } catch (e) {
    connectPromise = null;
    throw e;
  }
}

// 通用查询方法
export async function query(sqlText: string, params?: any[]) {
  const c = await getClient();
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
