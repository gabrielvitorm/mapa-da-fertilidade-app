import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { completeDay } from '@/lib/challenge-service';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { trackId?: string; dayNumber?: number };
  if (!body.trackId || body.dayNumber === undefined) {
    return NextResponse.json({ error: 'trackId and dayNumber are required' }, { status: 400 });
  }

  await completeDay(user.id, body.trackId, body.dayNumber);
  return NextResponse.json({ ok: true });
}
