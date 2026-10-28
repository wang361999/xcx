import { NextRequest } from 'next/server';

export function getAdminToken(req: NextRequest): string | null {
  // 支持两种方式: Header 或 Query
  const token = req.headers.get('x-admin-token') || req.nextUrl.searchParams.get('token');
  return token;
}

export function verifyAdminToken(req: NextRequest): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    console.warn('ADMIN_TOKEN not set in environment');
    return false;
  }
  const token = getAdminToken(req);
  return token === expected;
}

export function requireAdmin(req: NextRequest) {
  if (!verifyAdminToken(req)) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  return null;
}

// 生成简单的 token 用于浏览器端 localStorage
export function generateAdminToken(): string {
  return process.env.ADMIN_TOKEN || '';
}
