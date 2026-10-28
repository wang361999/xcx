import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, parseSessionToken } from '@/lib/session';

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 只有 /admin/* 路径需要鉴权
  if (!pathname.startsWith('/admin')) return NextResponse.next();

  // /admin/login 放行
  if (pathname === '/admin/login') return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const username = parseSessionToken(token || null);

  if (!username) {
    const url = new URL('/admin/login', req.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
