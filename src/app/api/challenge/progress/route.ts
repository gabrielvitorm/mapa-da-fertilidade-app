import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { updateLastSeenOrdem } from '@/lib/challenge-service';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { trackId?: string; dayNumber?: number; ordem?: number };
  if (!body.trackId || body.dayNumber === undefined || body.ordem === undefined) {
    return NextResponse.json({ error: 'trackId, dayNumber and ordem are required' }, { status: 400 });
  }

  await updateLastSeenOrdem(user.id, body.trackId, body.dayNumber, body.ordem);
  return NextResponse.json({ ok: true });
}
