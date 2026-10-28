import { get } from '@vercel/blob';

// 图片统一入口：私有 Blob 不暴露公开地址，统一由这里流式输出
export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathname = Array.isArray(path) ? path.join('/') : String(path);
  if (!pathname) return new Response('Not found', { status: 404 });

  try {
    const result = await get(pathname, { access: 'private' });
    if (!result || !result.stream) return new Response('Not found', { status: 404 });

    return new Response(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType || 'image/jpeg',
        // 图片永不变，让微信端长期缓存，减少函数调用
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
