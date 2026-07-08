import { NextRequest, NextResponse } from 'next/server';
import { handlePayment } from '@/lib/payment-handler';
import {
  verifyKiwifySignature,
  normalizeKiwifyPayload,
  type KiwifyWebhookBody,
} from '@/lib/kiwify-webhook';

export async function POST(request: NextRequest) {
  const signature = request.nextUrl.searchParams.get('signature');
  const rawBody = await request.text();

  if (!signature || !verifyKiwifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as KiwifyWebhookBody;

  try {
    const event = normalizeKiwifyPayload(body);
    await handlePayment(event);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Kiwify webhook processing failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
