import { NextRequest, NextResponse } from 'next/server';
import { parseSessionToken } from '@/lib/auth';

const SESSION_COOKIE = 'gallery_admin_session';

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 只有 /admin/* 路径需要鉴权
  if (!pathname.startsWith('/admin')) return NextResponse.next();

  // /admin/login 放行（没登录才能访问）
  if (pathname === '/admin/login') return NextResponse.next();

  // 检查 session cookie
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const username = parseSessionToken(token || null);

  if (!username) {
    // 没登录，重定向到登录页
    const url = new URL('/admin/login', req.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
