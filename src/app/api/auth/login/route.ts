import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession } from '@/lib/auth';

function isDatabaseUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'PrismaClientInitializationError' ||
    error.message.includes("Can't reach database server")
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Não encontramos essa conta' }, { status: 404 });
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        { error: 'Serviço temporariamente indisponível. Tente novamente em instantes.' },
        { status: 503 }
      );
    }

    throw error;
  }
}
