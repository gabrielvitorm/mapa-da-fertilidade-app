import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { submitDevolutiva } from '@/lib/challenge-service';
import type { DevolutivaTipo } from '@prisma/client';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    dayNumber?: number;
    tipo?: DevolutivaTipo;
    conteudo?: string;
    mediaUrl?: string;
  };
  if (body.dayNumber === undefined || !body.tipo) {
    return NextResponse.json({ error: 'dayNumber and tipo are required' }, { status: 400 });
  }

  await submitDevolutiva({
    userId: user.id,
    dayNumber: body.dayNumber,
    tipo: body.tipo,
    conteudo: body.conteudo,
    mediaUrl: body.mediaUrl,
  });
  return NextResponse.json({ ok: true });
}
