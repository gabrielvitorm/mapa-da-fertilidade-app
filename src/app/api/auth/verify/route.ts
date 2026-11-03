import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { magicLinkTokenHash } from '@/lib/magic-link-verification';

function invalidTokenResponse(request: NextRequest) {
  return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
}

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get('token');
  const secret = process.env.SESSION_SECRET;
  if (!rawToken || !secret) return invalidTokenResponse(request);

  const tokenHash = magicLinkTokenHash(rawToken, secret);
  const now = new Date();
  const token = await db.magicLinkToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!token || token.usedAt !== null || token.expiresAt <= now) {
    return invalidTokenResponse(request);
  }

  const consumed = await db.magicLinkToken.updateMany({
    where: {
      id: token.id,
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now },
  });

  if (consumed.count !== 1) return invalidTokenResponse(request);

  await createSession(token.userId);
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
