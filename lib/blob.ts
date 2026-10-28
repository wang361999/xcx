import { del } from '@vercel/blob';

// 图片对外访问基础地址
// 生产：https://xcx.gitd.cn/img （由 next.config rewrite 反代到 Blob 公共域名）
export function getPublicBase(): string {
  const base = (process.env.NEXT_PUBLIC_IMG_BASE || '').replace(/\/+$/, '');
  if (base) return base;
  return (process.env.BLOB_PUBLIC_ORIGIN || '').replace(/\/+$/, '');
}

// 删除 Blob 文件（key 即 blob pathname）
export async function deleteFile(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    await del(key);
  } catch (err) {
    console.error('blob delete error:', err);
  }
}
