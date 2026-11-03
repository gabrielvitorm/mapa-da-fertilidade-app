import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      service: 'mapa-fertilidade-app',
      dependencies: { database: 'ok' },
    });
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        service: 'mapa-fertilidade-app',
        dependencies: { database: 'unavailable' },
      },
      { status: 503 }
    );
  }
}
