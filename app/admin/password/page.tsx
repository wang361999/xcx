'use client';

import { useState } from 'react';

export default function PasswordPage() {
  const [oldPassword, setOld] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (newPassword.length < 4) {
      setError('新密码至少 4 位'); return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致'); return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('✓ 密码修改成功，下次登录用新密码');
        setOld(''); setNew(''); setConfirm('');
      } else {
        setError(data.error || '修改失败');
      }
    } catch { setError('网络错误'); }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">修改密码</h1>
      <p className="text-sm text-gray-500 mb-6">修改后下次登录生效，旧密码立即失效</p>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm max-w-md">
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">当前密码</label>
            <input type="password" value={oldPassword} onChange={e => setOld(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">新密码</label>
            <input type="password" value={newPassword} onChange={e => setNew(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">确认新密码</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" required />
          </div>

          {error && <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
          {success && <div className="text-sm text-emerald-500 bg-emerald-50 px-3 py-2 rounded-lg">{success}</div>}

          <button type="submit" disabled={loading} onClick={handleSubmit}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-rose-500 to-orange-400 text-white font-medium text-sm hover:shadow-lg hover:shadow-rose-200 disabled:opacity-60">
            {loading ? '修改中...' : '确认修改'}
          </button>
        </div>
      </div>
    </div>
  );
}
