import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { getUploadSignedUrl, generateR2Key } from '@/lib/r2';

const signSchema = z.object({
  fileName: z.string(),
  contentType: z.string().default('image/jpeg'),
});

export async function POST(req: NextRequest) {
  const authError = requireAuth(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const parsed = signSchema.parse(body);
    const ext = parsed.fileName.split('.').pop() || 'jpg';
    const key = generateR2Key('collections', ext);
    const { uploadUrl, publicUrl } = await getUploadSignedUrl(key, parsed.contentType);
    return NextResponse.json({ data: { uploadUrl, publicUrl, key } });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error('POST /api/admin/upload/sign:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
