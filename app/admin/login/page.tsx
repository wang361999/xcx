'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        const redirect = searchParams.get('redirect') || '/admin/collections';
        router.push(redirect);
      } else {
        setError(data.error || '登录失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-500 via-orange-400 to-amber-300 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">图</div>
          <h1 className="text-2xl font-bold text-gray-900">图库管理后台</h1>
          <p className="text-sm text-gray-500 mt-2">请输入管理员账号密码登录</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">用户名</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="admin" autoComplete="username"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="current-password"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" required />
          </div>
          {error && <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-rose-500 to-orange-400 text-white font-medium text-sm hover:shadow-lg hover:shadow-rose-200 disabled:opacity-60">
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-rose-500 via-orange-400 to-amber-300" />
    }>
      <LoginForm />
    </Suspense>
  );
}
