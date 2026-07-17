import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { updateChecklistProgress } from '@/lib/challenge-service';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    trackId?: string;
    dayNumber?: number;
    ordem?: number;
    checkedIndices?: number[];
  };
  if (
    !body.trackId ||
    body.dayNumber === undefined ||
    body.ordem === undefined ||
    !Array.isArray(body.checkedIndices)
  ) {
    return NextResponse.json(
      { error: 'trackId, dayNumber, ordem and checkedIndices are required' },
      { status: 400 }
    );
  }

  await updateChecklistProgress(user.id, body.trackId, body.dayNumber, body.ordem, body.checkedIndices);
  return NextResponse.json({ ok: true });
}
