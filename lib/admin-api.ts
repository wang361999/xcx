// 管理后台前端 API 调用工具
// 所有请求用 cookie session，不用手动带 token

export async function adminFetch(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> || {}),
    },
  });

  if (res.status === 401) {
    window.location.href = '/admin/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}
