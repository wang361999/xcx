import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireAuth } from '@/lib/auth';

// 客户端直传 Vercel Blob：浏览器先拿 token，再直接 PUT 到 Blob，不经过 Serverless Function
export async function POST(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;

  try {
    const body = (await req.json()) as HandleUploadBody;
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        maximumSizeInBytes: 20 * 1024 * 1024,
        addRandomSuffix: true,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      }),
      onUploadCompleted: async () => {
        // 客户端上传完成后会回调这里（本地开发环境不会触发）
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error('POST /api/admin/upload/sign:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Upload failed' },
      { status: 400 }
    );
  }
}
