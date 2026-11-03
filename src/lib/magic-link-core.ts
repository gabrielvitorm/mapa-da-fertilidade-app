import { createHmac, randomBytes } from 'node:crypto';

export const MAGIC_LINK_TTL_MS = 24 * 60 * 60 * 1000;

export function hashMagicToken(rawToken: string, secret: string): string {
  return createHmac('sha256', secret).update(rawToken).digest('hex');
}

export function createMagicToken(secret: string): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString('hex');
  return { rawToken, tokenHash: hashMagicToken(rawToken, secret) };
}

export function isMagicTokenExpired(expiresAt: Date, now = new Date()): boolean {
  return now.getTime() >= expiresAt.getTime();
}
