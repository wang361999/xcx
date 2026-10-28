import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { verifyCredentials, setSessionCookie, getSessionUsername, clearSessionCookie } from '@/lib/auth';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST /api/admin/login - 登录
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.parse(body);

    const result = await verifyCredentials(parsed.username, parsed.password);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, username: result.username });
    setSessionCookie(response, result.username!);
    return response;
  } catch (err: any) {
    console.error('[LOGIN ERROR]', err?.message || err);
    console.error('[LOGIN STACK]', err?.stack);
    if (err instanceof ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: 'Internal error', detail: err?.message }, { status: 500 });
  }
}

// GET /api/admin/login - 检查登录状态
export async function GET(req: NextRequest) {
  const username = getSessionUsername(req);
  if (!username) return NextResponse.json({ loggedIn: false });
  return NextResponse.json({ loggedIn: true, username });
}

// DELETE /api/admin/login - 登出
export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
