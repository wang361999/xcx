import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from './db';

const SESSION_COOKIE = 'gallery_admin_session';
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 天

// 生成伪 session token
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

// 验证账号密码（原生 SQL）
export async function verifyCredentials(username: string, password: string) {
  const result = await sql.query(
    'SELECT id, username, password_hash FROM admins WHERE username = $1 LIMIT 1',
    [username]
  );

  if (result.rows.length === 0) {
    return { success: false, error: '用户名或密码错误' };
  }

  const admin = result.rows[0];
  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    return { success: false, error: '用户名或密码错误' };
  }

  // 更新最后登录时间
  await sql.query(
    'UPDATE admins SET last_login_at = NOW() WHERE id = $1',
    [admin.id]
  );

  return { success: true, username: admin.username };
}

// 修改密码
export async function changePassword(username: string, oldPassword: string, newPassword: string) {
  const result = await sql.query(
    'SELECT id, password_hash FROM admins WHERE username = $1',
    [username]
  );
  if (result.rows.length === 0) return { success: false, error: '用户不存在' };

  const admin = result.rows[0];
  const valid = await bcrypt.compare(oldPassword, admin.password_hash);
  if (!valid) return { success: false, error: '原密码错误' };

  if (newPassword.length < 4) return { success: false, error: '新密码至少 4 位' };

  const hash = await bcrypt.hash(newPassword, 10);
  await sql.query(
    'UPDATE admins SET password_hash = $1 WHERE id = $2',
    [hash, admin.id]
  );
  return { success: true };
}

// 创建默认管理员
export async function createDefaultAdmin(username: string, password: string) {
  const result = await sql.query(
    'SELECT id FROM admins WHERE username = $1',
    [username]
  );
  if (result.rows.length > 0) return { ok: true, existing: true };
  const hash = await bcrypt.hash(password, 10);
  await sql.query(
    'INSERT INTO admins (username, password_hash) VALUES ($1, $2)',
    [username, hash]
  );
  return { ok: true, existing: false };
}

// 管理端 API 鉴权
export function requireAuth(req: NextRequest): NextResponse | null {
  const username = getSessionUsername(req);
  if (!username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
