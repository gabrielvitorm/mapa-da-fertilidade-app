import { redirect } from 'next/navigation';
import { requireSessionUser } from '@/lib/auth';
import { hasActiveEntitlement } from '@/lib/entitlements';
import { db } from '@/lib/db';
import { ChallengeOfferView } from '@/components/screens/ChallengeOfferView';
import type { NivelGlobal } from '@/types/assessment';

export const dynamic = 'force-dynamic';

export default async function DesafioOfertaPage() {
  const user = await requireSessionUser();

  const hasChallenge = await hasActiveEntitlement(user.id, 'CHALLENGE');
  if (hasChallenge) {
    redirect('/desafio');
  }

  const [product, assessment] = await Promise.all([
    db.product.findUnique({ where: { slug: 'desafio-7-dias' } }),
    db.assessment.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
  ]);

  if (!product) {
    throw new Error('Product desafio-7-dias not found — run `npm run db:seed`');
  }

  return (
    <ChallengeOfferView
      checkoutUrl={product.checkoutUrl}
      nivelGlobal={(assessment?.nivelGlobal as NivelGlobal | undefined) ?? undefined}
      primeiroNome={user.nome?.split(' ')[0] ?? undefined}
    />
  );
}
