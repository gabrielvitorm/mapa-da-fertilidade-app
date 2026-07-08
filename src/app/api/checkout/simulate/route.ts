import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { handlePayment } from '@/lib/payment-handler';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'DEMO_MODE is not enabled' }, { status: 403 });
  }

  const body = (await request.json()) as { email?: string; productSlug?: string; nome?: string };
  const email = body.email?.trim().toLowerCase();
  const productSlug = body.productSlug;

  if (!email || !productSlug) {
    return NextResponse.json({ error: 'email and productSlug are required' }, { status: 400 });
  }

  const product = await db.product.findUnique({ where: { slug: productSlug } });
  if (!product) {
    return NextResponse.json({ error: `Product "${productSlug}" not found` }, { status: 404 });
  }

  await handlePayment({
    platform: product.platform,
    transactionId: `DEMO-${randomUUID()}`,
    status: 'PAID',
    platformProductId: product.platformProductId,
    amountCents: product.priceCents,
    buyer: { email, nome: body.nome },
    raw: { simulated: true },
  });

  const user = await db.user.findUniqueOrThrow({ where: { email } });
  await createSession(user.id);

  return NextResponse.json({ ok: true });
}
