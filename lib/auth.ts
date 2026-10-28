import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { admins } from '@/lib/schema';
import { eq } from 'drizzle-orm';

const SESSION_COOKIE = 'gallery_admin_session';
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 天

// 生成一个伪 session token（实际存用户名，简单够用）
export function generateSessionToken(username: string): string {
  const raw = `${username}:${Date.now()}:${Math.random()}`;
  return Buffer.from(raw).toString('base64url');
}

// 解析 session token
export function parseSessionToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const [username, ts] = decoded.split(':');
    if (!username || !ts) return null;
    // 7 天过期
    if (Date.now() - parseInt(ts) > SESSION_TTL) return null;
    return username;
  } catch {
    return null;
  }
}

// 设置 session cookie
export function setSessionCookie(response: NextResponse, username: string) {
  const token = generateSessionToken(username);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.floor(SESSION_TTL / 1000),
    path: '/',
  });
}

// 清除 session cookie
export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

// 从请求中获取登录用户名
export function getSessionUsername(req: NextRequest): string | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  return parseSessionToken(token || null);
}

// 验证账号密码
export async function verifyCredentials(username: string, password: string): Promise<{ success: boolean; username?: string; error?: string }> {
  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.username, username))
    .limit(1);

  if (!admin) {
    return { success: false, error: '用户名或密码错误' };
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    return { success: false, error: '用户名或密码错误' };
  }

  // 更新最后登录时间
  await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, admin.id));

  return { success: true, username: admin.username };
}

// 修改密码
export async function changePassword(username: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const [admin] = await db.select().from(admins).where(eq(admins.username, username)).limit(1);
  if (!admin) return { success: false, error: '用户不存在' };

  const valid = await bcrypt.compare(oldPassword, admin.passwordHash);
  if (!valid) return { success: false, error: '原密码错误' };

  if (newPassword.length < 4) return { success: false, error: '新密码至少 4 位' };

  const hash = await bcrypt.hash(newPassword, 10);
  await db.update(admins).set({ passwordHash: hash }).where(eq(admins.id, admin.id));
  return { success: true };
}

// 创建默认管理员（setup.sh 调用）
export async function createDefaultAdmin(username: string, password: string) {
  const [existing] = await db.select().from(admins).where(eq(admins.username, username)).limit(1);
  if (existing) return { ok: true, existing: true };
  const hash = await bcrypt.hash(password, 10);
  await db.insert(admins).values({ username, passwordHash: hash });
  return { ok: true, existing: false };
}

// 管理端 API 鉴权中间件
export function requireAuth(req: NextRequest): NextResponse | null {
  const username = getSessionUsername(req);
  if (!username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
