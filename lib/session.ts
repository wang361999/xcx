/**
 * Session token 工具（Edge 安全，不依赖数据库/bcrypt）
 * middleware 与 API 共用
 */
export const SESSION_COOKIE = 'gallery_admin_session';
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 天

// 生成 session token
export function generateSessionToken(username: string): string {
  const raw = `${username}:${Date.now()}:${Math.random()}`;
  return Buffer.from(raw).toString('base64url');
}

// 解析 session token，返回用户名
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
