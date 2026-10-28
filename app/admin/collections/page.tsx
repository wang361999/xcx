'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-api';

interface Collection {
  id: number; title: string; description: string | null; coverUrl: string;
  sortOrder: number; status: 'published' | 'draft'; imageCount: number; createdAt: string;
}

export default function CollectionsList() {
  const [list, setList] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await adminFetch('/api/admin/collections');
      setList(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这个合集吗？里面的所有图片也会被删除！')) return;
    try {
      await adminFetch(`/api/admin/collections/${id}`, { method: 'DELETE' });
      setList(prev => prev.filter(c => c.id !== id));
    } catch (err: any) { alert(err.message); }
  };

  if (loading) return <div className="text-center text-gray-400 py-20">加载中...</div>;

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">合集管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理所有合集内容，发布后小程序端实时同步</p>
        </div>
        <Link href="/admin/collections/new" className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-orange-400 text-white text-sm font-medium hover:shadow-lg hover:shadow-rose-200 transition-all">
          ＋ 新建合集
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">全部合集</div>
          <div className="text-2xl font-bold text-gray-900">{list.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">已发布</div>
          <div className="text-2xl font-bold text-emerald-500">{list.filter(c => c.status === 'published').length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">总图片数</div>
          <div className="text-2xl font-bold text-gray-900">{list.reduce((s, c) => s + (c.imageCount || 0), 0)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">草稿</div>
          <div className="text-2xl font-bold text-amber-500">{list.filter(c => c.status === 'draft').length}</div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 font-medium">
              <th className="text-left px-4 py-3 w-16">排序</th>
              <th className="text-left px-4 py-3 w-20">封面</th>
              <th className="text-left px-4 py-3">合集名称</th>
              <th className="text-left px-4 py-3 w-20">图片数</th>
              <th className="text-left px-4 py-3 w-24">状态</th>
              <th className="text-left px-4 py-3 w-28">创建时间</th>
              <th className="text-right px-4 py-3 w-36">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-12">还没有合集，点击右上角"新建合集"开始吧</td></tr>
            ) : list.map(c => (
              <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-sm text-gray-500">#{c.sortOrder}</td>
                <td className="px-4 py-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                    {c.coverUrl && <img src={c.coverUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{c.title}</div>
                  {c.description && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{c.description}</div>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.imageCount}</td>
                <td className="px-4 py-3">
                  {c.status === 'published'
                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">● 已发布</span>
                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">● 草稿</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString('zh-CN')}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-3 justify-end text-sm">
                    <Link href={`/admin/collections/${c.id}`} className="text-rose-500 hover:text-rose-600">编辑</Link>
                    <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-500">删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
