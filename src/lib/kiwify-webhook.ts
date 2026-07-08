import { createHmac, timingSafeEqual } from 'crypto';
import type { PaymentEvent } from '@/lib/payment-handler';
import type { OrderStatus } from '@prisma/client';

export interface KiwifyWebhookBody {
  order_id: string;
  order_status: string;
  Product: {
    product_id: string;
    product_name: string;
  };
  Customer: {
    full_name: string;
    email: string;
    mobile?: string;
    cnpj?: string;
  };
  Commissions: {
    charge_amount: number;
  };
}

export function verifyKiwifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.KIWIFY_WEBHOOK_SECRET;
  if (!secret) throw new Error('KIWIFY_WEBHOOK_SECRET is not set');

  const expected = createHmac('sha1', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const providedBuf = Buffer.from(signature, 'hex');

  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

function mapKiwifyStatus(orderStatus: string): OrderStatus {
  switch (orderStatus) {
    case 'paid':
      return 'PAID';
    case 'refunded':
      return 'REFUNDED';
    case 'chargedback':
    case 'chargeback':
      return 'CHARGEBACK';
    default:
      throw new Error(
        `Unmapped Kiwify order_status: "${orderStatus}" — valores conhecidos: paid, refunded, chargedback. Confirme o valor real antes de tratar como definitivo.`
      );
  }
}

export function normalizeKiwifyPayload(body: KiwifyWebhookBody): PaymentEvent {
  return {
    platform: 'KIWIFY',
    transactionId: body.order_id,
    status: mapKiwifyStatus(body.order_status),
    platformProductId: body.Product.product_id,
    amountCents: body.Commissions.charge_amount,
    buyer: {
      email: body.Customer.email,
      nome: body.Customer.full_name,
      cpf: body.Customer.cnpj,
      celular: body.Customer.mobile,
    },
    raw: body,
  };
}
