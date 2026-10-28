import { NextResponse } from 'next/server';
import { initDatabase, getInitLog } from '@/lib/init';

// 幂等建表 + 写入默认数据（可重复调用，不会覆盖已有数据）
export async function GET() {
  try {
    await initDatabase();
    return NextResponse.json({ ok: true, log: getInitLog() });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e), log: getInitLog() },
      { status: 500 }
    );
  }
}
