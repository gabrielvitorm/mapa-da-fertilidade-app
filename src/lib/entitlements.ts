import { db } from '@/lib/db';
import type { EntitlementType } from '@prisma/client';

export async function hasActiveEntitlement(
  userId: string,
  type: EntitlementType
): Promise<boolean> {
  const count = await db.entitlement.count({
    where: { userId, type, status: 'ACTIVE' },
  });
  return count > 0;
}
