import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    const [productCount, challengeTrackCount] = await Promise.all([
      db.product.count(),
      db.challengeTrack.count(),
    ]);
    const catalogReady = productCount >= 2 && challengeTrackCount >= 3;

    return NextResponse.json({
      status: catalogReady ? 'ok' : 'error',
      service: 'mapa-fertilidade-app',
      dependencies: {
        database: 'ok',
        catalog: catalogReady ? 'ok' : 'unavailable',
      },
    }, { status: catalogReady ? 200 : 503 });
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        service: 'mapa-fertilidade-app',
        dependencies: { database: 'unavailable', catalog: 'unavailable' },
      },
      { status: 503 }
    );
  }
}
