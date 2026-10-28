// 简单的前端 API 调用工具（管理后台用）
// 实际项目里可以用 fetch 封装，这里直接用

const ADMIN_TOKEN_KEY = 'admin_token';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }
}

export function clearAdminToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

export async function adminFetch(path: string, init?: RequestInit) {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['x-admin-token'] = token;
  }

  const res = await fetch(path, { ...init, headers });

  if (res.status === 401) {
    clearAdminToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
    throw new Error('Unauthorized');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}
