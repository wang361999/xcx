import { del } from '@vercel/blob';

// 删除 Blob 文件（key 即 blob pathname）
export async function deleteFile(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    await del(key);
  } catch (err) {
    console.error('blob delete error:', err);
  }
}
