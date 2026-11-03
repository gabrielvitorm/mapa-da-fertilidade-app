import { db } from '@/lib/db';
import type { Platform, OrderStatus } from '@prisma/client';
import { sendMagicLink } from '@/lib/magic-link';

export interface PaymentEvent {
  platform: Platform;
  transactionId: string;
  status: OrderStatus;
  platformProductId: string;
  amountCents: number;
  buyer: {
    email: string;
    cpf?: string;
    nome?: string;
    celular?: string;
  };
  raw: unknown;
}

export async function sendMagicLinkSafely(
  userId: string,
  sender: (userId: string) => Promise<void> = sendMagicLink
): Promise<void> {
  try {
    await sender(userId);
  } catch (error) {
    console.error('[magic-link] falha ao emitir link após pagamento:', error);
  }
}

export async function handlePayment(event: PaymentEvent): Promise<void> {
  const existingOrder = await db.order.findUnique({
    where: { platformTransactionId: event.transactionId },
  });
  if (existingOrder) return;

  const product = await db.product.findFirst({
    where: { platformProductId: event.platformProductId, platform: event.platform },
  });
  if (!product) {
    throw new Error(
      `Unknown platformProductId "${event.platformProductId}" for platform ${event.platform}`
    );
  }

  const email = event.buyer.email.trim().toLowerCase();
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      nome: event.buyer.nome,
      cpf: event.buyer.cpf,
      celular: event.buyer.celular,
    },
  });

  const orphanAssessment = await db.assessment.findFirst({
    where: { userId: null, leadEmail: email },
    orderBy: { createdAt: 'desc' },
  });
  if (orphanAssessment) {
    await db.assessment.update({
      where: { id: orphanAssessment.id },
      data: { userId: user.id },
    });
  }

  await db.order.create({
    data: {
      userId: user.id,
      productId: product.id,
      platform: event.platform,
      platformTransactionId: event.transactionId,
      status: event.status,
      amountCents: event.amountCents,
      rawPayload: event.raw as object,
    },
  });

  if (event.status === 'PAID') {
    const grants = product.grants as {
      entitlement: 'REPORT' | 'CHALLENGE' | 'BUMP';
      trackByLevel?: boolean;
    };
    const metadata: Record<string, unknown> = {};

    if (grants.entitlement === 'CHALLENGE' && grants.trackByLevel) {
      const latestAssessment = await db.assessment.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      if (latestAssessment) {
        const track = await db.challengeTrack.findUnique({
          where: { level: latestAssessment.nivelGlobal },
        });
        if (track) {
          metadata.track = latestAssessment.nivelGlobal;
          await db.challengeProgress.upsert({
            where: { userId_trackId: { userId: user.id, trackId: track.id } },
            update: {},
            create: { userId: user.id, trackId: track.id, currentDay: 0 },
          });
        }
      }
    }

    await db.entitlement.create({
      data: {
        userId: user.id,
        productId: product.id,
        type: grants.entitlement,
        status: 'ACTIVE',
        metadata: metadata as unknown as object,
      },
    });

    await sendMagicLinkSafely(user.id);
  } else {
    await db.entitlement.updateMany({
      where: { userId: user.id, productId: product.id, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
  }
}
