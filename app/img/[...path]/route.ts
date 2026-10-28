import { head } from '@vercel/blob';

// 图片统一入口：小程序只认自己的域名，这里 302 到 Blob 真实地址
// 好处：不依赖任何 blob 域名配置，也不用在微信后台加额外白名单
export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathname = Array.isArray(path) ? path.join('/') : String(path);
  if (!pathname) return new Response('Not found', { status: 404 });

  try {
    const blob = await head(pathname);
    return new Response(null, {
      status: 302,
      headers: {
        Location: blob.url,
        // 让微信/CDN 缓存住跳转，避免每次看图都打一次函数
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
