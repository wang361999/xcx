import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { changePassword, getSessionUsername } from '@/lib/auth';

const schema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(4, '新密码至少 4 位'),
});

// POST /api/admin/password - 修改密码
export async function POST(req: NextRequest) {
  const username = getSessionUsername(req);
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const parsed = schema.parse(await req.json());
    const result = await changePassword(username, parsed.oldPassword, parsed.newPassword);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
