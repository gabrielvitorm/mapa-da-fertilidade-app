import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { submitDevolutiva } from '@/lib/challenge-service';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { dayNumber?: number; texto?: string };
  if (body.dayNumber === undefined || !body.texto?.trim()) {
    return NextResponse.json({ error: 'dayNumber and texto are required' }, { status: 400 });
  }

  await submitDevolutiva({ userId: user.id, dayNumber: body.dayNumber, texto: body.texto });
  return NextResponse.json({ ok: true });
}
