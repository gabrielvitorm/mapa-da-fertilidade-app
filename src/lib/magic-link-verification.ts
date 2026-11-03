import { hashMagicToken } from '@/lib/magic-link-core';

export interface MagicLinkRecord {
  expiresAt: Date;
  usedAt: Date | null;
}

export function isMagicLinkUsable(record: MagicLinkRecord, now = new Date()): boolean {
  return record.usedAt === null && record.expiresAt.getTime() > now.getTime();
}

export function magicLinkTokenHash(rawToken: string, secret: string): string {
  return hashMagicToken(rawToken, secret);
}
