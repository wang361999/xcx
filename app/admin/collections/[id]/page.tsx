'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-api';

interface ImageItem {
  id?: number;
  title?: string | null;
  imageUrl: string;
  r2Key: string;
  copyright?: string | null;
  sortOrder?: number;
}

export default function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState({
    id: undefined as number | undefined,
    title: '', description: '', coverUrl: '', r2Key: '',
    sortOrder: 0, status: 'draft' as 'published' | 'draft',
    images: [] as ImageItem[],
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p = async () => {
      const { id } = await params;
      if (id && id !== 'new') {
        try {
          const res = await adminFetch(`/api/admin/collections/${id}`);
          setData({
            id: res.data.id, title: res.data.title,
            description: res.data.description || '', coverUrl: res.data.coverUrl,
            r2Key: res.data.r2Key, sortOrder: res.data.sortOrder || 0,
            status: res.data.status, images: res.data.images || [],
          });
        } catch { router.push('/admin/collections'); }
      }
    };
    p();
  }, [params, router]);

  const uploadFileToR2 = async (file: File) => {
    const signRes = await adminFetch('/api/admin/upload/sign', {
      method: 'POST',
      body: JSON.stringify({ fileName: file.name, contentType: file.type }),
    });
    const { uploadUrl, publicUrl, r2Key } = signRes.data;
    await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    return { publicUrl, r2Key };
  };

  const handleCoverUpload = async (file: File) => {
    try {
      setUploading(true);
      const { publicUrl, r2Key } = await uploadFileToR2(file);
      setData(prev => ({ ...prev, coverUrl: publicUrl, r2Key }));
    } catch (err: any) { alert('封面上传失败: ' + err.message); }
    finally { setUploading(false); }
  };

  const handleImagesUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    const newImages: ImageItem[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        const { publicUrl, r2Key } = await uploadFileToR2(file);
        newImages.push({
          imageUrl: publicUrl, r2Key,
          title: file.name.replace(/\.[^/.]+$/, ''),
          sortOrder: data.images.length + newImages.length,
        });
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      } catch (err) { console.error(err); }
    }

    setData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));

    // 如果已存在合集，直接写数据库
    if (data.id && newImages.length > 0) {
      try {
        await adminFetch('/api/admin/images', {
          method: 'POST',
          body: JSON.stringify(newImages.map(img => ({ ...img, collectionId: data.id }))),
        });
      } catch (err: any) { alert('保存图片信息失败: ' + err.message); }
    }

    setUploading(false);
    setUploadProgress(0);
  };

  const handleDeleteImage = async (index: number) => {
    if (!confirm('确定删除这张图片？')) return;
    const img = data.images[index];
    if (img.id) {
      try { await adminFetch(`/api/admin/images/${img.id}`, { method: 'DELETE' }); }
      catch (err: any) { alert(err.message); return; }
    }
    setData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleSave = async (publish: boolean) => {
    if (!data.title.trim()) { alert('请输入合集标题'); return; }
    if (!data.coverUrl) { alert('请上传封面图'); return; }

    setSaving(true);
    try {
      if (data.id) {
        await adminFetch(`/api/admin/collections/${data.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...data, status: publish ? 'published' : 'draft' }),
        });
      } else {
        const res = await adminFetch('/api/admin/collections', {
          method: 'POST',
          body: JSON.stringify({ ...data, status: publish ? 'published' : 'draft' }),
        });
        const newId = res.data.id;
        if (data.images.length > 0) {
          await adminFetch('/api/admin/images', {
            method: 'POST',
            body: JSON.stringify(data.images.map(img => ({ ...img, collectionId: newId }))),
          });
        }
      }
      router.push('/admin/collections');
    } catch (err: any) { alert('保存失败: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/collections" className="text-gray-400 hover:text-gray-600 text-sm">← 返回合集列表</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{data.id ? '编辑合集' : '新建合集'}</h1>
      <p className="text-sm text-gray-500 mb-6">修改后小程序端自动同步更新</p>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">基本信息</div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">合集标题 <span className="text-red-500">*</span></label>
                <input type="text" value={data.title} onChange={e => setData({ ...data, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">合集简介</label>
                <textarea value={data.description} onChange={e => setData({ ...data, description: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">封面图 <span className="text-red-500">*</span></label>
                <label className="block cursor-pointer">
                  <input type="file" accept="image/*" onChange={e => e.target.files && handleCoverUpload(e.target.files[0])} className="hidden" />
                  {data.coverUrl ? (
                    <div className="relative">
                      <img src={data.coverUrl} className="w-full h-44 object-cover rounded-lg border border-gray-200" />
                      <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center text-white text-sm opacity-0 hover:opacity-100 transition-opacity">点击更换</div>
                    </div>
                  ) : (
                    <div className="h-44 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-rose-400 hover:text-rose-400">
                      <div className="text-3xl mb-2">🖼️</div>
                      <div className="text-sm">点击上传封面图</div>
                      <div className="text-xs mt-1">图片直传到 Cloudflare R2</div>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center">
              <div className="text-sm font-semibold text-gray-900">合集内图片（{data.images.length} 张）</div>
              <div className="flex gap-2">
                {uploading && <span className="text-xs text-gray-500 self-center">上传中 {uploadProgress}%</span>}
                <label className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-500 text-sm cursor-pointer hover:bg-rose-100">
                  <input ref={fileInputRef} type="file" accept="image/*" multiple
                    onChange={e => handleImagesUpload(e.target.files)} className="hidden" />
                  ＋ 上传图片
                </label>
              </div>
            </div>
            <div className="p-5">
              {data.images.length === 0 ? (
                <div className="text-center text-gray-400 py-12 text-sm">还没有图片，点击"上传图片"添加</div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {data.images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img src={img.imageUrl} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center">
                        <button onClick={() => handleDeleteImage(idx)} className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">删除</button>
                      </div>
                      <input type="text" value={img.title || ''} onChange={e => {
                        const newImgs = [...data.images];
                        newImgs[idx] = { ...img, title: e.target.value };
                        setData({ ...data, images: newImgs });
                      }} placeholder="标题"
                        className="w-full text-xs px-1.5 py-1 mt-1 border border-gray-200 rounded outline-none focus:border-rose-400" />
                      <input type="text" value={img.copyright || ''} onChange={e => {
                        const newImgs = [...data.images];
                        newImgs[idx] = { ...img, copyright: e.target.value };
                        setData({ ...data, images: newImgs });
                      }} placeholder="版权"
                        className="w-full text-xs px-1.5 py-1 mt-1 border border-gray-200 rounded outline-none focus:border-rose-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm sticky top-20">
            <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-900">小程序端显示</div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">排序权重</label>
                <input type="number" value={data.sortOrder} onChange={e => setData({ ...data, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
                <p className="text-xs text-gray-400 mt-1">数字越小越靠前</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">合集状态</label>
                <select value={data.status} onChange={e => setData({ ...data, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-rose-500">
                  <option value="published">● 已发布（小程序可见）</option>
                  <option value="draft">○ 草稿（仅后台可见）</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-2">
              <Link href="/admin/collections" className="flex-1 px-4 py-2.5 rounded-lg bg-gray-50 text-gray-600 text-sm text-center hover:bg-gray-100">取消</Link>
              <button onClick={() => handleSave(false)} disabled={saving}
                className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 disabled:opacity-60">草稿</button>
              <button onClick={() => handleSave(true)} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-rose-500 to-orange-400 text-white text-sm font-medium hover:shadow-lg hover:shadow-rose-200 disabled:opacity-60">
                {saving ? '保存中...' : (data.id ? '保存' : '创建')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
