import { db } from '@/lib/db';
import { createMagicToken, MAGIC_LINK_TTL_MS } from '@/lib/magic-link-core';

export interface MagicLinkPayload {
  email: string;
  nome: string | null;
  magicLinkUrl: string;
}

export class MagicLinkDeliveryError extends Error {
  constructor() {
    super('Magic link delivery failed');
    this.name = 'MagicLinkDeliveryError';
  }
}

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export function buildMagicLinkPayload(
  user: Pick<MagicLinkPayload, 'email' | 'nome'>,
  magicLinkUrl: string
): MagicLinkPayload {
  return { email: user.email, nome: user.nome, magicLinkUrl };
}

export async function deliverMagicLink(
  payload: MagicLinkPayload,
  webhookUrl: string | undefined,
  fetchImpl: FetchLike = fetch
): Promise<boolean> {
  if (!webhookUrl) {
    console.warn('[magic-link] N8N_MAGIC_LINK_WEBHOOK_URL não configurado');
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetchImpl(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`[magic-link] n8n respondeu HTTP ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[magic-link] falha ao chamar o webhook do n8n:', error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendMagicLink(userId: string): Promise<void> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, nome: true },
  });
  const { rawToken, tokenHash } = createMagicToken(secret);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  await db.magicLinkToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';
  const magicLinkUrl = new URL('/api/auth/verify', baseUrl);
  magicLinkUrl.searchParams.set('token', rawToken);

  const webhookUrl = process.env.N8N_MAGIC_LINK_WEBHOOK_URL;
  if (!webhookUrl && process.env.NODE_ENV !== 'production') {
    console.info(`[magic-link] link local para ${user.email}: ${magicLinkUrl.toString()}`);
    return;
  }

  const delivered = await deliverMagicLink(
    buildMagicLinkPayload(user, magicLinkUrl.toString()),
    webhookUrl
  );
  if (!delivered) throw new MagicLinkDeliveryError();
}
