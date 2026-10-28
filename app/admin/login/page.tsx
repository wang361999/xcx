'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAdminToken } from '@/lib/admin-api';

export default function LoginPage() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 从后端获取正确的 token（简单验证）
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-token': token },
      });
      if (res.ok) {
        setAdminToken(token);
        router.push('/admin/collections');
      } else {
        setError('Token 错误');
      }
    } catch {
      setError('网络错误');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-500 via-orange-400 to-amber-300 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">图</div>
          <h1 className="text-2xl font-bold text-gray-900">图库管理后台</h1>
          <p className="text-sm text-gray-500 mt-2">请输入管理员 Token 登录</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin Token</label>
            <input type="password" value={token} onChange={e => setToken(e.target.value)}
              placeholder="在 .env 中配置的 ADMIN_TOKEN"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" required />
          </div>
          {error && <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
          <button type="submit" className="w-full py-2.5 rounded-lg bg-gradient-to-r from-rose-500 to-orange-400 text-white font-medium text-sm hover:shadow-lg hover:shadow-rose-200 transition-all">登录</button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-6">Token 在项目 .env.local 的 ADMIN_TOKEN 字段中配置</p>
      </div>
    </div>
  );
}
